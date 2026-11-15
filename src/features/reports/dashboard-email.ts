import { z } from "zod";
import { summaryLabels, type DashboardBrief } from "@/features/case-management/dashboard-summary";

export function dashboardEmailDraft(brief: DashboardBrief) {
  return {
    subject: `Hackleaf dashboard update — ${summaryLabels[brief.period]} (${brief.end})`,
    body: `Hello,\n\nHere is our dashboard update for ${brief.start ?? 'all recorded dates'} through ${brief.end} (America/Phoenix).\n\n${brief.text}\n\nSource: saved client and service records. ${brief.mode === 'ai' ? 'AI-assisted selection of calculated facts.' : 'Calculated factual brief.'}\nFictional demo data; SQL is disabled. Funding simulation is not included.\n\nBest,\nThe team`,
  };
}

export const emailUpdate = z.object({
  to: z.string().trim().max(1300).transform(value => value.split(',').map(s => s.trim()))
    .pipe(z.array(z.email().max(254)).min(1).max(5)),
  subject: z.string().trim().min(1).max(150).regex(/^[^\r\n]+$/, 'Subject must be one line.'),
  body: z.string().trim().min(1).max(6000),
});
export type EmailUpdate = z.output<typeof emailUpdate>;

export function emailAppUrl(draft: EmailUpdate) {
  return `mailto:${draft.to.map(encodeURIComponent).join(',')}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
}

function base64(value: string) {
  return btoa(Array.from(new TextEncoder().encode(value), byte => String.fromCharCode(byte)).join(''));
}

function encodedSubject(value: string) {
  const chunks: string[] = [];
  let chunk = '';
  for (const character of value) {
    if (new TextEncoder().encode(chunk + character).length > 42) { chunks.push(chunk); chunk = ''; }
    chunk += character;
  }
  if (chunk) chunks.push(chunk);
  return chunks.map(part => `=?UTF-8?B?${base64(part)}?=`).join('\r\n ');
}

export function emailDraftFile(draft: EmailUpdate) {
  const body = base64(draft.body.replace(/\r?\n/g, '\r\n')).match(/.{1,76}/g)?.join('\r\n') ?? '';
  return ['X-Unsent: 1', `To: ${draft.to.join(',\r\n ')}`, `Subject: ${encodedSubject(draft.subject)}`,
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64', '', body, ''].join('\r\n');
}
