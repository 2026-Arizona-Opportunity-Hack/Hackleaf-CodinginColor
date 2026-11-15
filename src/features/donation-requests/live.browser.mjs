// Isolated integration harness: PGlite runs the actual migrations; a local Auth /
// PostgREST stub supplies ONLY fictional staff and donors. No hosted writes/mail.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { PGlite } from "@electric-sql/pglite";
import { chromium } from "@playwright/test";
const db=new PGlite();
const staff="10000000-0000-4000-8000-000000000001";
const donorA="20000000-0000-4000-8000-000000000001",donorB="20000000-0000-4000-8000-000000000002";
const user={id:staff,email:"staff@example.org",aud:"authenticated",role:"authenticated",app_metadata:{provider:"email"},user_metadata:{display_name:"Fictional staff",test_padding:"x".repeat(5000)},created_at:new Date().toISOString()};
const jwt=(role,exp=Math.floor(Date.now()/1000)+3600)=>`${Buffer.from(JSON.stringify({alg:"HS256",typ:"JWT"})).toString("base64url")}.${Buffer.from(JSON.stringify({sub:staff,role,aud:"authenticated",exp,iat:Math.floor(Date.now()/1000)})).toString("base64url")}.fictional-local-test`;
let app,browser,stub,logs="", refreshes=0, rejectRefresh=false, revoked=false;
try{
  await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
    insert into auth.users values('${staff}');`);
  for(const file of ["202611140001_foundation.sql","202611140002_imports_settings.sql","202611140003_request_funding.sql","202611140004_request_access.sql"])
    await db.exec(readFileSync(new URL(`../../../supabase/migrations/${file}`,import.meta.url),"utf8"));
  await db.exec(`insert into public.members(id,display_name,role) values('${staff}','Fictional staff','admin');
    insert into public.programs values('ai-academy','AI Academy',false);
    insert into public.donors(id,name,kind,owner_id) values('${donorA}','Fictional Alice','individual','${staff}'),('${donorB}','Fictional Bob','individual','${staff}');
    select set_config('request.jwt.claim.sub','${staff}',false); set role authenticated;`);
  // Serialize the harness's single PGlite connection; production serialization is
  // implemented by the migration's shared row lock, not this test server.
  let queue=Promise.resolve();
  stub=createServer((req,res)=>{
    queue=queue.then(async()=>{
      const path=new URL(req.url,"http://localhost").pathname;
      let body="";for await(const part of req) body+=part;
      const args=body?JSON.parse(body):{};
      let result;
      if(path==="/auth/v1/token") {
        const refresh=new URL(req.url,"http://localhost").searchParams.get("grant_type")==="refresh_token";
        if(refresh) refreshes++;
        if(refresh && (rejectRefresh || revoked)) {res.statusCode=400;result={code:"refresh_token_not_found",message:"Fictional refresh expired"};}
        else {revoked=false;result={access_token:jwt("authenticated"),refresh_token:"fictional-refresh",expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:"bearer",user};}
      }
      else if(path==="/auth/v1/user") {if(revoked){res.statusCode=401;result={code:"session_not_found",message:"Session revoked"};}else result=user;}
      else if(path==="/auth/v1/logout") {revoked=true;res.statusCode=204;}
      else if(path==="/rest/v1/donors") result=(await db.query("select * from public.donors")).rows;
      else if(path==="/rest/v1/gifts") result=(await db.query("select * from public.gifts")).rows;
      else if(path==="/rest/v1/members") {const rows=(await db.query("select id,display_name,role,active from public.members")).rows;result=req.headers.accept?.includes("vnd.pgrst.object")?rows[0]??null:rows;}
      else if(path==="/rest/v1/rpc/request_funding_snapshot") result=(await db.query("select public.request_funding_snapshot() data")).rows[0].data;
      else if(path==="/rest/v1/rpc/save_donation_request")result=(await db.query("select public.save_donation_request($1,$2,$3,$4,$5,$6,$7,$8,$9) id",[args.p_id,args.p_revision,args.p_campaign,args.p_program_id,args.p_goal_cents,args.p_source,args.p_frequency,args.p_note,args.p_state])).rows[0].id;
      else{res.statusCode=404;result={message:"Unknown local fixture endpoint",code:"NOT_FOUND"};}
      res.setHeader("content-type","application/json");res.end(JSON.stringify(result));
    }).catch(error=>{res.statusCode=400;res.setHeader("content-type","application/json");res.end(JSON.stringify({message:error.message,code:"P0001"}));});
  });
  await new Promise(resolve=>stub.listen(0,"127.0.0.1",resolve));
  const base="http://127.0.0.1:3104";
  app=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","--webpack","--hostname","127.0.0.1","--port","3104"],{env:{...process.env,APP_DATA_MODE:"live",NEXT_PUBLIC_SUPABASE_URL:`http://127.0.0.1:${stub.address().port}`,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:jwt("anon")},stdio:["ignore","pipe","pipe"]});
  app.stdout.on("data",data=>{logs+=data;});app.stderr.on("data",data=>{logs+=data;});
  let ready=false;
  for(let i=0;i<80;i++){try{if((await fetch(`${base}/api/health`)).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,250));}
  assert.ok(ready,"Local fixture app started");
  browser=await chromium.launch();
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  page.setDefaultTimeout(15000);
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(`${base}/auth/sign-in`);
  await page.getByLabel("Staff email").fill("staff@example.org");
  await page.getByLabel("Password",{exact:true}).fill("Fictional-password-123");
  await page.getByRole("button",{name:"Sign in to live workspace",exact:true}).click();
  await page.waitForURL("**/dashboard");
  await page.getByRole("heading",{name:"Welcome, Fictional staff.",exact:true}).waitFor();
  assert.equal(await page.getByRole("link",{name:"Staff sign-in",exact:true}).count(),0);
  assert.equal(await page.getByRole("link",{name:"Register as staff",exact:true}).count(),0);
  await page.getByRole("button",{name:"Sign out",exact:true}).waitFor();
  await page.reload();await page.getByRole("heading",{name:"Welcome, Fictional staff.",exact:true}).waitFor();
  await page.goto(`${base}/auth/sign-in`);await page.waitForURL("**/dashboard");
  await page.goto(`${base}/auth/register`);await page.waitForURL("**/dashboard");
  await page.screenshot({path:"/tmp/hackleaf-welcome-dashboard.png",fullPage:true});
  const authCookies=()=>page.context().cookies(base).then(list=>list.filter(c=>/auth-token(?:\.\d+)?$/.test(c.name)).sort((a,b)=>a.name.localeCompare(b.name)));
  assert.ok((await authCookies()).length>1,"Fixture exercises chunked SDK cookies");
  async function expireCookie(){
    const chunks=await authCookies();
    assert.ok(chunks.every(c=>c.path==="/" && c.sameSite==="Lax"));
    const encoded=chunks.map(c=>c.value).join("");
    assert.ok(encoded.startsWith("base64-"));
    const session=JSON.parse(Buffer.from(encoded.slice(7),"base64url").toString());
    session.expires_at=Math.floor(Date.now()/1000)-60;session.access_token=jwt("authenticated",session.expires_at);
    const expired="base64-"+Buffer.from(JSON.stringify(session)).toString("base64url");let offset=0;
    await page.context().addCookies(chunks.map((c,i)=>{const value=i===chunks.length-1?expired.slice(offset):expired.slice(offset,offset+c.value.length);offset+=c.value.length;return {...c,value};}));
  }
  await expireCookie();
  const refreshed=await page.goto(`${base}/dashboard`);
  await page.getByRole("heading",{name:"Welcome, Fictional staff.",exact:true}).waitFor();
  assert.ok(refreshes>0,"Expired session refreshed server-side");
  assert.match(refreshed.headers()["cache-control"],/no-store/);
  await page.reload();await page.getByRole("heading",{name:"Welcome, Fictional staff.",exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(k=>/supabase|auth-token/i.test(k))),false);
  const otherTab=await page.context().newPage();await otherTab.goto(`${base}/dashboard`);
  await otherTab.getByRole("heading",{name:"Welcome, Fictional staff.",exact:true}).waitFor();
  await page.goto(`${base}/donation-requests`);
  await page.getByRole("heading",{name:"Donation requests",exact:true}).waitFor();
  async function create(title,amount){
    await page.getByRole("button",{name:/Make a donation request/}).first().click();
    await page.getByLabel("Donation title",{exact:false}).fill(title);
    await page.getByLabel("Program",{exact:false}).selectOption("ai-academy");
    await page.getByLabel("Amount required",{exact:false}).fill(amount);
    await page.getByLabel("What is the donation for?",{exact:false}).fill("Fictional classroom supplies for the local integration test.");
    assert.equal(await page.getByLabel("Priority",{exact:true}).count(),0);
    await page.getByRole("button",{name:"Create request",exact:true}).click();
    await page.getByRole("dialog").waitFor({state:"detached"});
    await page.getByRole("article",{name:title,exact:true}).waitFor();
  }
  await create("Test classroom request","100");await create("Test next request","50");
  const first=page.getByRole("article",{name:"Test classroom request",exact:true});
  const second=page.getByRole("article",{name:"Test next request",exact:true});
  await first.getByText("Priority 1",{exact:true}).waitFor();await second.getByText("Priority 2",{exact:true}).waitFor();
  async function receipt(amount,donor,key){await db.query("insert into public.gifts(donor_id,amount_cents,received_on,program_id,source,source_record_id) values($1,$2,'2026-11-14','general','zeffy',$3)",[donor,amount,key]);}
  await receipt(2000,donorA,"alice-20");await receipt(1000,donorB,"bob-10");
  await page.reload();await first.getByText("$30",{exact:true}).waitFor();await second.getByText("$0",{exact:true}).waitFor();
  await first.getByRole("button",{name:"View donors & details"}).click();
  await page.getByText("Fictional Alice",{exact:true}).waitFor();await page.getByText("Fictional Bob",{exact:true}).waitFor();
  await page.getByText("$20 allocated",{exact:true}).waitFor();await page.getByText("$10 allocated",{exact:true}).waitFor();
  await page.getByRole("button",{name:"Close request panel"}).click();
  await receipt(10000,donorA,"alice-100");await page.reload();
  await first.getByText("Completed",{exact:true}).waitFor();await second.getByText("$30",{exact:true}).waitFor();
  await page.getByRole("button",{name:"Download spreadsheet",exact:true}).click();
  await page.getByRole("status").filter({hasText:"spreadsheet downloaded"}).waitFor();
  await page.screenshot({path:"/tmp/hackleaf-live-requests-test.png",fullPage:true});
  await first.getByRole("button",{name:"Edit request"}).click();
  await page.getByLabel("Donation title",{exact:false}).fill("Test persisted classroom request");
  await page.getByRole("button",{name:"Save changes",exact:true}).click();
  await page.getByRole("dialog").waitFor({state:"detached"});await page.reload();
  await page.getByRole("article",{name:"Test persisted classroom request",exact:true}).waitFor();
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.getByRole("button",{name:/Make a donation request/}).first().click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:"/tmp/hackleaf-live-requests-mobile-test.png",fullPage:true});
  await page.getByRole("button",{name:"Close request panel"}).click();
  await page.getByRole("button",{name:"Sign out",exact:true}).click();
  await page.waitForURL("**/auth/sign-in");
  assert.equal((await authCookies()).length,0,"Sign-out clears every cookie chunk");
  await otherTab.bringToFront();await otherTab.evaluate(()=>window.dispatchEvent(new Event("focus")));
  await otherTab.waitForURL("**/auth/sign-in");
  await page.goBack();await page.goto(`${base}/dashboard`);await page.waitForURL("**/auth/sign-in");
  await page.getByLabel("Staff email").fill("staff@example.org");await page.getByLabel("Password",{exact:true}).fill("Fictional-password-123");
  await page.getByRole("button",{name:"Sign in to live workspace",exact:true}).click();await page.waitForURL("**/dashboard");
  rejectRefresh=true;await expireCookie();await page.goto(`${base}/dashboard`);await page.waitForURL("**/auth/sign-in");
  assert.equal((await authCookies()).length,0,"Rejected refresh clears stale cookies");rejectRefresh=false;
  await db.exec("reset role; update public.members set active=false; set role authenticated;");
  await page.getByLabel("Staff email").fill("staff@example.org");await page.getByLabel("Password",{exact:true}).fill("Fictional-password-123");
  await page.getByRole("button",{name:"Sign in to live workspace",exact:true}).click();await page.waitForURL("**/dashboard");
  await page.getByRole("heading",{name:"Welcome to Hackleaf.",exact:true}).waitFor();
  await page.getByText("Manage donation requests from your signed-in account.",{exact:true}).waitFor();
  assert.equal(await page.getByRole("link",{name:"Staff sign-in",exact:true}).count(),0);
  await page.getByText("Your staff membership exists but is inactive.", { exact:false }).waitFor();
  await page.getByRole("navigation").getByRole("link", {name:"Donors",exact:true}).waitFor();
  await page.getByRole("navigation").getByRole("link", {name:"Donation requests",exact:true}).waitFor();
  await page.getByText(staff,{exact:true}).waitFor();
  await page.goto(`${base}/donation-requests`);
  await create("No-approval request","25");
  await page.reload();await page.getByRole("article",{name:"No-approval request",exact:true}).waitFor();
  assert.equal(await page.getByText("Fictional Alice",{exact:true}).count(),0);
  assert.deepEqual(errors,[]);
  console.log("PASS isolated live SQL + UI: create, unique priorities, $20+$10, spillover, donor details, reload persistence, edit, CSV, mobile, welcome dashboard, reload, auth-page redirects, chunked cookie refresh, rejected refresh, cross-tab logout and pending membership. No hosted writes.");
}catch(error){console.error(logs.slice(-3000));throw error;}
finally{await browser?.close();if(app){app.kill("SIGTERM");await new Promise(resolve=>app.once("exit",resolve));}if(stub)await new Promise(resolve=>stub.close(resolve));await db.close();}
