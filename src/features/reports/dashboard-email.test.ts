import { expect, it } from 'vitest';
import { dashboardEmailDraft, emailUpdate, emailAppUrl, emailDraftFile } from './dashboard-email';

it('keeps the selected window, factual source and demo limitations in the draft', () => {
  const draft = dashboardEmailDraft({period:'month',start:'2026-11-01',end:'2026-11-15',text:'3 services recorded.',mode:'facts',notice:'AI is off.'});
  expect(draft.subject).toContain('Month');
  expect(draft.body).toContain('2026-11-01 through 2026-11-15');
  expect(draft.body).toContain('3 services recorded.');
  expect(draft.body).toContain('Fictional demo');
  expect(draft.body).toContain('Funding simulation is not included');
});

it('rejects invalid recipients, header injection, empty content and excessive recipients', () => {
  const valid = {to:'team@example.org',subject:'Update',body:'Hello'};
  for (const patch of [{to:'wrong'}, {to:'team@example.org\r\nBcc:other@example.org'}, {subject:'Hello\r\nBcc:other@example.org'}, {body:''}, {to:Array(6).fill('team@example.org').join(',')}]) {
    expect(emailUpdate.safeParse({...valid,...patch}).success).toBe(false);
  }
});

it('encodes email-app queries and Unicode MIME drafts without turning body text into headers', () => {
  const draft = emailUpdate.parse({to:'one@example.org, two@example.org',subject:'Update — café',body:'Hello & thanks\nBcc: not-a-header'});
  const url = emailAppUrl(draft);
  expect(new URL(url).searchParams.get('body')).toBe(draft.body);
  expect(new URL(url).searchParams.get('subject')).toBe(draft.subject);
  const eml = emailDraftFile(draft), [headers,body] = eml.split('\r\n\r\n');
  expect(headers).toContain('X-Unsent: 1');
  expect(headers).toContain('To: one@example.org,\r\n two@example.org');
  expect(headers).not.toContain('Bcc:');
  expect(Buffer.from(body.replace(/\r\n/g,''),'base64').toString('utf8')).toBe(draft.body.replace(/\n/g,'\r\n'));
});

it('folds long Unicode subjects into complete encoded words', () => {
  const subject = 'Important update — '.repeat(6), draft = emailUpdate.parse({to:'team@example.org',subject,body:'Message'});
  const encoded = emailDraftFile(draft).match(/=\?UTF-8\?B\?([^?]+)\?=/g) ?? [];
  expect(encoded.length).toBeGreaterThan(1);
  expect(encoded.every(word=>word.length<=75)).toBe(true);
  expect(encoded.map(word=>Buffer.from(word.slice(10,-2),'base64').toString('utf8')).join('')).toBe(subject.trim());
});
