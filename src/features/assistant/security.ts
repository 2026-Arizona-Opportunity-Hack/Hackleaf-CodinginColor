import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { Action, Proposal } from "./contracts";
import { parseAction } from "./contracts";
import type { Actor } from "./policy";

const state = globalThis as typeof globalThis & { __hackleafAISecret?: string; __hackleafAIRates?: Map<string, { count: number; expires: number }> };
function secret() {
  if (process.env.AI_ACTION_SECRET && process.env.AI_ACTION_SECRET.length >= 32) return process.env.AI_ACTION_SECRET;
  if (process.env.NODE_ENV === "production") throw new Error("Configure AI_ACTION_SECRET with at least 32 random characters before enabling the assistant in production.");
  return state.__hackleafAISecret ??= randomBytes(32).toString("hex");
}
const digest = (input: string) => createHmac("sha256", secret()).update(input).digest("base64url");
const equal = (a: string, b: string) => Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
function sign(value: unknown) { const body = Buffer.from(JSON.stringify(value)).toString("base64url"); return `${body}.${digest(body)}`; }
function unpack(token: string): unknown {
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra || !equal(digest(body), signature)) throw new Error("The review token is invalid. Ask the assistant to prepare a fresh action.");
  return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
}

export function sessionFor(request: Request): string | null {
  const token = request.headers.get("cookie")?.split(";").map((v) => v.trim()).find((v) => v.startsWith("hackleaf_ai_session="))?.slice("hackleaf_ai_session=".length);
  if (!token) return null;
  try {
    const value = unpack(token) as { id: string; expires: number };
    return typeof value.id === "string" && value.expires > Date.now() ? value.id : null;
  } catch { return null; }
}
export function newSession() {
  const id = randomUUID();
  return { id, cookie: `hackleaf_ai_session=${sign({ id, expires: Date.now() + 43200000 })}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200${process.env.NODE_ENV === "production" ? "; Secure" : ""}` };
}

interface SignedAction { id: string; actor: string; session: string; mode: string; audience: string; expiresAt: number; action: Action; before: Record<string, unknown>; }
export function signProposal(actor: Actor, action: Action, before: Record<string, unknown>, title: string, fields: Record<string, string>): Proposal {
  const id = randomUUID(), expiresAt = Date.now() + 10 * 60000;
  return { id, title, fields, expiresAt, action, before, token: sign({ id, actor: actor.id, session: actor.sessionId, mode: actor.mode, audience: actor.audience, expiresAt, action, before }) };
}
export function verifyProposal(token: string, actor: Actor): SignedAction {
  const value = unpack(token) as SignedAction;
  if (value.actor !== actor.id || value.session !== actor.sessionId || value.mode !== actor.mode || value.audience !== actor.audience || !(value.expiresAt > Date.now())) throw new Error("This action expired or belongs to another session. Prepare it again.");
  return { ...value, action: parseAction(value.action.name, value.action.input) };
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  return JSON.stringify(value);
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  // Next.js may use its internal localhost origin while the browser uses 127.0.0.1.
  const host = request.headers.get("host") ?? new URL(request.url).host;
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && new URL(origin).host !== host)) throw new Error("Use the assistant from this website.");
}
export function consumeRate(key: string, max: number, interval: number, now = Date.now()) {
  const buckets = state.__hackleafAIRates ??= new Map();
  for (const [id, value] of buckets) if (value.expires <= now) buckets.delete(id);
  if (buckets.size >= 5000 && !buckets.has(key)) return false;
  const value = buckets.get(key) ?? { count: 0, expires: now + interval };
  if (value.count >= max) return false;
  value.count++; buckets.set(key, value); return true;
}
export async function boundedJson(request: Request, maxBytes = 250000): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("A JSON request is required.");
  let bytes = 0, text = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) { await reader.cancel(); throw new Error("This conversation is too large. Start a new chat or attach a smaller CSV."); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } finally { reader.releaseLock(); }
}
