import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { loginDemo } from '../demo-auth/browser-session.mjs';

const dir = await mkdtemp(join(tmpdir(), 'hackleaf-email-')), base = 'http://127.0.0.1:3111';
let server, browser, logs = '';
try {
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3111'], {
    env:{...process.env,APP_DATA_MODE:'demo',DEMO_DATA_DIR:dir,AI_DEMO_ENABLED:'false'},stdio:['ignore','pipe','pipe'],
  });
  for (const stream of [server.stdout,server.stderr]) stream.on('data', d => logs += d);
  let ready = false;
  for (let i=0;i<80;i++) {
    try { if ((await fetch(base+'/api/health')).ok) { ready=true; break; } } catch {}
    await new Promise(r=>setTimeout(r,200));
  }
  assert.ok(ready);
  browser = await chromium.launch();
  const page = await browser.newPage({viewport:{width:1440,height:1100}}), errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  await loginDemo(page,base,'staff');
  await page.getByRole('region',{name:'Automatic staff email',exact:true}).getByText(/Off — sender/).waitFor();
  const brief=page.getByRole('region',{name:'Dashboard brief',exact:true});
  await brief.getByRole('button',{name:'Month',exact:true}).click();
  await brief.getByRole('button',{name:'Email update ↗',exact:true}).waitFor({state:'visible'});
  await brief.getByRole('button',{name:'Email update ↗',exact:true}).click();
  const composer=page.getByRole('region',{name:'Email dashboard update',exact:true});
  const link=composer.getByText('Open email app ↗',{exact:true});
  assert.equal(await link.getAttribute('href'),null);
  await composer.getByLabel('Recipients (up to 5, separated by commas)').fill('colleague@example.org');
  const subject=composer.getByLabel('Email subject'),body=composer.getByLabel('Important updates');
  assert.match(await subject.inputValue(),/Month/);
  assert.match(await body.inputValue(),/Fictional demo data/);
  const review=composer.getByRole('checkbox');
  await review.check();
  const href=await link.getAttribute('href');
  assert.match(href,/^mailto:colleague%40example.org/);
  assert.equal(new URL(href).searchParams.get('body'),await body.inputValue());
  await subject.fill('Important team update');
  assert.equal(await review.isChecked(),false);
  assert.equal(await link.getAttribute('href'),null);
  await review.check();
  const downloading=page.waitForEvent('download');
  await composer.getByRole('button',{name:'Download email draft (.eml)',exact:true}).click();
  const download=await downloading,eml=await readFile(await download.path(),'utf8');
  assert.match(eml,/X-Unsent: 1/);
  assert.match(eml,/To: colleague@example.org/);
  await composer.getByText(/Nothing has been sent by Hackleaf/).waitFor();
  await brief.getByRole('button',{name:'Year',exact:true}).click();
  await composer.getByRole('button',{name:'Replace with latest brief',exact:true}).waitFor();
  assert.equal(await subject.inputValue(),'Important team update');
  await composer.getByRole('button',{name:'Replace with latest brief',exact:true}).click();
  assert.match(await subject.inputValue(),/Year/);
  assert.equal(await review.isChecked(),false);
  await body.fill('Long reviewed update. '.repeat(200));
  await review.check();
  assert.equal(await link.getAttribute('href'),null);
  assert.equal(await composer.getByRole('button',{name:'Download email draft (.eml)',exact:true}).isEnabled(),true);
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await body.fill('Our team update.');
  await page.screenshot({path:'/tmp/hackleaf-dashboard-email-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1100});
  await composer.scrollIntoViewIfNeeded();
  await page.screenshot({path:'/tmp/hackleaf-dashboard-email.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS: staff email draft, period snapshot, review invalidation, encoded mailto, MIME download, long-message fallback and mobile layout. No email sent.');
} catch(e) { console.error(logs.slice(-1500)); throw e; }
finally {
  await browser?.close();
  if(server) { server.kill('SIGTERM'); await new Promise(r=>server.once('exit',r)); }
  await rm(dir,{recursive:true,force:true});
}
