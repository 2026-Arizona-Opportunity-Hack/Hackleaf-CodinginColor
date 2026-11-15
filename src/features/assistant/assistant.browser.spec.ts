import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { newSession } from "./security";
import { initialRelationships } from "./demo-state";
import { demoMembers, demoDate } from "@/lib/demo/data";
import { demoRequests, demoRequestGifts } from "@/features/donation-requests/requests";
import { allocateDonations } from "@/features/donation-requests/allocation";
import { runTool } from "./tools";
import type { AssistantEvent, DemoSnapshot } from "./contracts";
import type { ToolContext } from "./server-context";

async function loginDemoAdmin(page: Page) {
  await page.goto("/auth/sign-in");
  await page.getByLabel("Email",{exact:true}).fill("admin@hackleaf.demo");
  await page.getByLabel("Password",{exact:true}).fill("DemoAdmin!2026");
  await page.getByRole("button",{name:"Sign in",exact:true}).click();
  await page.waitForURL("**/dashboard");
}

async function setup(page: Page) {
  await loginDemoAdmin(page);
  const session = newSession();
  const signedIn = await (await page.request.get("/auth/session")).json();
  await page.context().addCookies([{ name: "hackleaf_ai_session", value: session.cookie.split(";")[0].slice("hackleaf_ai_session=".length), domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Strict" }]);
  const snapshot: DemoSnapshot = { relationships: initialRelationships(), giving: { requests: demoRequests, gifts: demoRequestGifts, allocations: allocateDonations(demoRequests, demoRequestGifts) }, profile: null };
  const context: ToolContext = { actor: { id: `demo:${session.id}:staff:${signedIn.accountId}`, sessionId: session.id, mode: "demo", audience: "staff", role: "admin", today: demoDate }, snapshot, db: null, attachment: null,
    data: async () => ({ ...snapshot.relationships, members: demoMembers, evidence: [], partial: false }) };
  const proposals:AssistantEvent[]=[],artifacts:AssistantEvent[]=[];
  await runTool(context, "create_follow_up", { donorId: snapshot.relationships.donors[0].id, title: "Call about the AI Academy update", dueOn: "2026-11-16", kind: "check_in" }, (e) => proposals.push(e));
  await runTool(context, "prepare_funder_packet", { donorId: snapshot.relationships.donors[1].id, start: "2026-01-01", end: demoDate }, (e) => artifacts.push(e));
  await page.route("**/api/assistant/status?*", (route) => route.fulfill({ json: { ready: true, mode: "demo", message: "Isolated UI test provider" } }));
  await page.route("**/api/assistant/chat", async (route) => {
    const body = route.request().postDataJSON();
    const query: string = body.messages.at(-1).content;
    if (query.includes("slow")) { await new Promise((resolve) => setTimeout(resolve, 2500)); }
    const events:AssistantEvent[] = query.includes("Prepare a next step") ? [...proposals, { type: "text", delta: "Prepared for review. Nothing is saved until you apply the action." }]
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

async function simulateExtensionMarkers(page: Page) {
  // Simulate both reported extension mutations as the HTML is parsed, including
  // Next's hidden metadata divs outside RootLayout. Don't re-add removed markers.
  await page.addInitScript(() => {
    const visited = new WeakSet<Element>();
    let injected = 0;
    Object.defineProperty(window, "__testInjectedMarkers", { get: () => injected });
    function mark(element: Element) {
      if (visited.has(element)) return;
      visited.add(element);
      if (element.tagName === "DIV") { element.setAttribute("bis_skin_checked", "1"); injected++; }
      if (element.tagName === "BODY") element.setAttribute("__processed_637e92d4-3bc6-4f9d-9e20-aee6f51a194c__", "true");
    }
    const observer = new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        mark(node); node.querySelectorAll("div,body").forEach(mark);
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  });
}

test("extension markers across framework markup and app pages hydrate without an error overlay", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await simulateExtensionMarkers(page);
  await setup(page);
  await expect(page).toHaveTitle("Hackleaf · Coding in Color");
  expect(await page.evaluate(() => Reflect.get(window, "__testInjectedMarkers"))).toBeGreaterThan(10);
  await expect(page.locator(".app-shell[bis_skin_checked], .app-shell [bis_skin_checked]")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveAttribute("__processed_637e92d4-3bc6-4f9d-9e20-aee6f51a194c__", "true");
  await expect(page.getByRole("heading", { name: "What can we move forward?" })).toBeVisible();
  await page.screenshot({ path: "/tmp/hackleaf-assistant-hydration-fixed.png" });
  expect(errors).toEqual([]);
});

test("every demo route hydrates and opens the assistant with extension markers and a different browser year", async ({ page }) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await simulateExtensionMarkers(page);
  await loginDemoAdmin(page);
  await page.clock.setFixedTime(new Date("2030-01-01T00:00:00Z"));
  await page.route("**/api/assistant/status?*", (route) => route.fulfill({ json: { ready: true, message: "Isolated UI test provider" } }));
  const routes = ["/dashboard", "/clients", "/clients/new", "/client-settings", "/", "/donors", "/donors/00000000-0000-4000-8000-000000000001", "/imports", "/follow-ups", "/retention", "/reports", "/donation-requests"];
  for (const path of routes) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page).toHaveURL(`http://127.0.0.1:3310${path}`);
    await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Open Hackleaf assistant" }).click();
    await expect(page.getByLabel("Message Hackleaf assistant")).toBeEnabled();
    await expect(page.locator(".app-shell[bis_skin_checked], .app-shell [bis_skin_checked]")).toHaveCount(0);
    await page.getByRole("button", { name: "Close assistant panel" }).click();
    await expect(page.getByRole("button", { name: "Open Hackleaf assistant" })).toBeFocused();
    if (path === "/retention") {
      await expect(page.getByLabel("Previous year")).toHaveValue("2025");
      await expect(page.getByLabel("Current year")).toHaveValue("2026");
    }
    expect(errors, path).toEqual([]);
  }
  await page.screenshot({ path: "/tmp/hackleaf-all-routes-hydration-fixed.png" });
});

test("unrelated hydration mismatches still produce diagnostics", async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_DEV !== "true", "React reports attribute diagnostics in development.");
  const diagnostics: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") diagnostics.push(message.text()); });
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      if (!document.body) return;
      document.body.setAttribute("data-unexpected-hydration", "keep-this-diagnostic");
      observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await setup(page);
  await expect.poll(() => diagnostics.some((message) => message.includes("data-unexpected-hydration"))).toBe(true);
  await expect(page.locator("body")).toHaveAttribute("data-unexpected-hydration", "keep-this-diagnostic");
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

test("mobile layout, Stop and focus return", async ({ page }) => {
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
});
