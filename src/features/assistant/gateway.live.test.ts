import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { openAIProvider, providerError } from "./openai";
import { runAssistant } from "./engine";
import { initialRelationships } from "./demo-state";
import { demoRequests, demoRequestGifts } from "@/features/donation-requests/requests";
import { allocateDonations } from "@/features/donation-requests/allocation";
import { demoDate, demoMembers } from "@/lib/demo/data";
import type { ToolContext } from "./server-context";
import type { AssistantEvent } from "./contracts";

// Explicit opt-in only: real gateway use spends a small amount of team credit.
it.skipIf(process.env.RUN_GATEWAY_LIVE !== "true")("streams real gateway tools and a reviewed proposal using fictional data", async () => {
  process.loadEnvFile(".env");
  expect(process.env.OHACK_API_KEY?.trim()).toBeTruthy();
  const relationships = initialRelationships();
  const context: ToolContext = {
    actor: { id: "gateway-test", sessionId: "gateway-test", mode: "demo", audience: "staff", role: "admin", today: demoDate },
    snapshot: { relationships, giving: { requests: demoRequests, gifts: demoRequestGifts, allocations: allocateDonations(demoRequests, demoRequestGifts) }, profile: null },
    db: null, attachment: null, data: async () => ({ ...relationships, members: demoMembers, evidence: [], partial: false }),
  };
  const events: AssistantEvent[] = [];
  await runAssistant(context, [{ role: "user", content: "Find Jordan Ellis and prepare one check-in follow-up due 2026-11-16 titled Gateway test. Do not apply it." }], "/donors", openAIProvider(), event => events.push(event), AbortSignal.timeout(55000)).catch(error => { throw new Error(providerError(error)); });
  expect(events.some(event => event.type === "proposal"), JSON.stringify(events.map(event => event.type === "text" ? { type: event.type, delta: event.delta } : event.type === "tool" ? { type: event.type, name: event.name } : { type: event.type }))).toBe(true);
  expect(events.some(event => event.type === "text" && event.delta.length > 0)).toBe(true);
  expect(events.at(-1)?.type).toBe("done");
}, 60000);
