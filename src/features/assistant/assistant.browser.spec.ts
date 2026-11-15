import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { newSession } from "./security";
import { initialRelationships } from "./demo-state";
import { demoMembers, demoDate } from "@/lib/demo/data";
import { demoRequests, demoRequestGifts } from "@/features/donation-requests/requests";
import { allocateDonations } from "@/features/donation-requests/allocation";
import { runTool } from "./tools";
import { initialDemoProfile } from "@/features/donor-portal/model";
import type { AssistantEvent, DemoSnapshot } from "./contracts";
import type { ToolContext } from "./server-context";

async function setup(page: Page) {
  const session = newSession();
  await page.context().addCookies([{ name: "hackleaf_ai_session", value: session.cookie.split(";")[0].slice("hackleaf_ai_session=".length), domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Strict" }]);
  const snapshot: DemoSnapshot = { relationships: initialRelationships(), giving: { requests: demoRequests, gifts: demoRequestGifts, allocations: allocateDonations(demoRequests, demoRequestGifts) }, profile: null };
  const context: ToolContext = { actor: { id: `demo:${session.id}:staff:staff`, sessionId: session.id, mode: "demo", audience: "staff", role: "admin", today: demoDate }, snapshot, db: null, attachment: null,
    data: async () => ({ ...snapshot.relationships, members: demoMembers, evidence: [], partial: false }) };
  const proposals: AssistantEvent[] = [], artifacts: AssistantEvent[] = [], preferenceChanges: AssistantEvent[] = [];
  await runTool(context, "create_follow_up", { donorId: snapshot.relationships.donors[0].id, title: "Call about the AI Academy update", dueOn: "2026-11-16", kind: "check_in" }, (e) => proposals.push(e));
  await runTool(context, "prepare_funder_packet", { donorId: snapshot.relationships.donors[1].id, start: "2026-01-01", end: demoDate }, (e) => artifacts.push(e));
  await runTool({ ...context, actor: { ...context.actor, id: `demo:${session.id}:donor:${initialDemoProfile.id}`, audience: "donor", role: "donor" }, snapshot: { ...snapshot, profile: initialDemoProfile } }, "update_my_profile", { phone: "555-0102", is_anonymous: true, do_not_contact: "all" }, (e) => preferenceChanges.push(e));
  await page.route("**/api/assistant/status?*", (route) => route.fulfill({ json: { ready: true, mode: "demo", message: "Isolated UI test provider" } }));
  await page.route("**/api/assistant/chat", async (route) => {
    const body = route.request().postDataJSON();
    const query: string = body.messages.at(-1).content;
    if (body.path.startsWith("/donor-portal")) expect(body.demo.relationships.donors).toEqual([]);
    if (query.includes("slow")) { await new Promise((resolve) => setTimeout(resolve, 2500)); }
    const events: AssistantEvent[] = query.includes("Change my contact") ? [...preferenceChanges, { type: "text", delta: "Your own demo preferences are prepared for review." }]
      : query.includes("Prepare a next step") ? [...proposals, { type: "text", delta: "Prepared for review. Nothing is saved until you apply the action." }]
      : query.includes("packet") ? [...artifacts, { type: "text", delta: "Your gift-history packet is ready. Verified outcomes are unavailable." }]
        : [{ type: "text", delta: "Fictional lapsed donors: **Alex Rivera**, **Jamie Park**, and **Drew Williams**." }];
    events.push({ type: "done", inputTokens: 0, outputTokens: 0 });
    try { await route.fulfill({ status: 200, contentType: "application/x-ndjson", body: events.map((e) => JSON.stringify(e)).join("\n") + "\n" }); } catch { /* A stopped request is expected to abort. */ }
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Open Hackleaf assistant" }).click();
  await expect(page.getByLabel("Message Hackleaf assistant")).toBeEnabled();
  return { snapshot, proposal: proposals[0].type === "proposal" ? proposals[0].proposal : null };
}
async function send(page: Page, text: string) {
  await page.getByLabel("Message Hackleaf assistant").fill(text);
  await page.getByRole("dialog").getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop assistant response" })).toBeHidden({ timeout: 15000 });
}

test("extension-added body attributes hydrate without an error overlay", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  // Simulate the exact external mutation from the reported hydration diff,
  // before any application JavaScript runs.
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      if (!document.body) return;
      document.body.setAttribute("__processed_637e92d4-3bc6-4f9d-9e20-aee6f51a194c__", "true");
      observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await setup(page);
  await expect(page).toHaveTitle("Hackleaf · Coding in Color");
  await expect(page.locator("body")).toHaveAttribute("__processed_637e92d4-3bc6-4f9d-9e20-aee6f51a194c__", "true");
  await expect(page.getByRole("heading", { name: "What can we move forward?" })).toBeVisible();
  await page.screenshot({ path: "/tmp/hackleaf-assistant-hydration-fixed.png" });
  expect(errors).toEqual([]);
});

test("navigation ignores a late connection check and keeps the current chat usable", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await setup(page);
  let release!: () => void;
  const delayed = new Promise<void>((resolve) => { release = resolve; });
  await page.unroute("**/api/assistant/status?*");
  await page.route("**/api/assistant/status?*", async (route) => {
    const path = new URL(route.request().url()).searchParams.get("path");
    if (path === "/follow-ups") {
      await delayed;
      await route.fulfill({ json: { ready: false, message: "Obsolete connection result" } });
    } else await route.fulfill({ json: { ready: true, message: "Current connection ready" } });
  });
  const pendingCheck = page.waitForRequest((request) => new URL(request.url()).searchParams.get("path") === "/follow-ups");
  await page.getByRole("navigation").getByRole("link", { name: "Follow-ups", exact: true }).click();
  await pendingCheck;
  const currentCheck = page.waitForResponse((response) => new URL(response.url()).searchParams.get("path") === "/donors");
  await page.getByRole("navigation").getByRole("link", { name: "Donors", exact: true }).click();
  await currentCheck;
  const obsoleteCheck = page.waitForResponse((response) => new URL(response.url()).searchParams.get("path") === "/follow-ups");
  release();
  await obsoleteCheck;
  // A fresh assistant turn after the old response arrives proves readiness
  // still belongs to the current route and that the chat remains interactive.
  await send(page, "Find lapsed donors");
  await expect(page.getByRole("dialog").getByText("Alex Rivera", { exact: true })).toBeVisible();
  await expect(page.getByText("Obsolete connection result")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("review/apply, signed token security, navigation state and actual packet download", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const { snapshot, proposal } = await setup(page);
  const panel = page.getByRole("dialog", { name: "Hackleaf assistant" });
  await send(page, "Find lapsed donors");
  await expect(panel.getByRole("article", { name: "Assistant reply" }).filter({ hasText: "Alex Rivera" })).toBeVisible();
  await send(page, "Prepare a next step for Jordan");
  const card = panel.getByRole("region", { name: "Create next step" });
  await expect(card).toBeVisible();
  await expect(page.getByRole("heading", { name: "Call about the AI Academy update", exact: true })).toHaveCount(0);
  const stale = structuredClone(snapshot); stale.relationships.donors[0].name = "Changed after review";
  const payload = { token: proposal!.token, path: "/", demo: stale };
  expect((await page.request.post("/api/assistant/actions", { data: payload })).status()).toBe(409);
  expect((await page.request.post("/api/assistant/actions", { data: { ...payload, token: proposal!.token + "tampered" } })).status()).toBe(400);
  await card.getByRole("button", { name: "Apply demo change", exact: true }).click();
  await expect(card.getByText("Applied", { exact: true })).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).include("#hackleaf-assistant").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  const replay = await page.request.post("/api/assistant/actions", { data: { ...payload, demo: snapshot } });
  expect(replay.status()).toBe(200); expect((await replay.json()).replayed).toBe(true);
  await page.screenshot({ path: "/tmp/hackleaf-assistant-reviewed.png" });
  await panel.getByRole("button", { name: "Close assistant panel" }).click();
  await page.getByRole("navigation").getByRole("link", { name: "Follow-ups", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Call about the AI Academy update", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open Hackleaf assistant" }).click();
  await expect(panel.getByText("Applied", { exact: true })).toBeVisible();
  await send(page, "Prepare a funder packet");
  const pending = page.waitForEvent("download"); await panel.getByRole("button", { name: /Mesa Learning Fund.*funder packet/ }).click();
  expect((await pending).suggestedFilename()).toContain("funder-packet");
  expect(errors).toEqual([]);
});

test("mobile layout, Stop, focus return and staff/donor chat isolation", async ({ page }) => {
  await setup(page);
  const panel = page.getByRole("dialog", { name: "Hackleaf assistant" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(panel.getByRole("heading", { name: "What can we move forward?" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const bounds = await panel.boundingBox(); expect(bounds!.x >= 0 && bounds!.x + bounds!.width <= 390).toBe(true);
  await page.screenshot({ path: "/tmp/hackleaf-assistant-mobile.png" });
  await page.getByLabel("Message Hackleaf assistant").fill("Start a slow response");
  await panel.getByRole("button", { name: "Send message", exact: true }).click();
  await panel.getByRole("button", { name: "Stop assistant response" }).click();
  await expect(panel.getByText("Response stopped. Unapplied changes are still only proposals.")).toBeVisible();
  await send(page, "Find lapsed donors");
  await panel.getByRole("button", { name: "Close assistant panel" }).click();
  await expect(page.getByRole("button", { name: "Open Hackleaf assistant" })).toBeFocused();
  await page.getByRole("navigation").getByRole("link", { name: "Donor portal", exact: true }).click();
  await expect(page.getByRole("heading", { name: "A little support. A new possibility." })).toBeVisible();
  await page.getByRole("button", { name: "Open Hackleaf assistant" }).click();
  await expect(panel.getByRole("heading", { name: "What can we move forward?" })).toBeVisible();
  await expect(panel.getByText("Alex Rivera", { exact: false })).toHaveCount(0);
});

test("donor preferences update the actual profile without erasing staff workspace state", async ({ page }) => {
  await setup(page);
  let panel = page.getByRole("dialog", { name: "Hackleaf assistant" });
  await panel.getByRole("button", { name: "Close assistant panel" }).click();
  await page.getByRole("navigation").getByRole("link", { name: "Donor portal", exact: true }).click();
  await page.getByRole("heading", { name: "A little support. A new possibility." }).waitFor();
  await page.getByRole("navigation").getByRole("link", { name: "Login as donor", exact: true }).click();
  await page.getByRole("button", { name: "Enter donor demo", exact: true }).click();
  await page.getByRole("navigation").getByRole("link", { name: "My profile", exact: true }).click();
  await expect(page.getByLabel("Phone (optional)")).toHaveValue("");
  await page.getByRole("button", { name: "Open Hackleaf assistant" }).click();
  panel = page.getByRole("dialog", { name: "Hackleaf assistant" });
  await send(page, "Change my contact preferences and phone");
  await panel.getByRole("button", { name: "Apply demo change", exact: true }).click();
  await expect(panel.getByText("Applied", { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Close assistant panel" }).click();
  await expect(page.getByLabel("Phone (optional)")).toHaveValue("555-0102");
  await expect(page.getByLabel("Show my simulated contributions")).toBeChecked();
  await page.getByRole("navigation").getByRole("link", { name: "NGO demo", exact: true }).click();
  await page.getByRole("navigation").getByRole("link", { name: "Donors", exact: true }).click();
  await expect(page.getByRole("link", { name: "Jordan Ellis", exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("12 relationships");
});
