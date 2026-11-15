import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3102";
  await page.goto(`${base}/auth/sign-in`);
  await page.getByRole("heading", { name: "Sign in to the live workspace." }).waitFor();
  await page.getByLabel("Staff email").waitFor();
  assert.equal(await page.getByLabel("Password", { exact: true }).getAttribute("type"), "password");
  await page.screenshot({ path: "/tmp/hackleaf-live-sign-in.png", fullPage: true, caret: "initial" });
  await page.getByRole("link", { name: "Register as staff", exact: true }).first().click();
  await page.getByRole("heading", { name: "Register as staff.", exact: true }).waitFor();
  await page.getByLabel("Full name", { exact: true }).fill("Fictional validation test");
  await page.getByLabel("Staff email", { exact: true }).fill("validation@example.org");
  await page.getByLabel("Password", { exact: true }).fill("Fictional-pass-123");
  await page.getByLabel("Confirm password", { exact: true }).fill("Different-pass-123");
  await page.getByRole("button", { name: "Register as staff", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "matching passwords" }).waitFor();
  assert.equal(await page.getByLabel("Role", { exact: true }).count(), 0);
  await page.screenshot({ path: "/tmp/hackleaf-staff-registration.png", fullPage: true, caret: "initial" });
  await page.goto(`${base}/auth/callback?next=https://example.org`);
  assert.equal(new URL(page.url()).pathname, "/auth/sign-in");
  await page.getByRole("alert").filter({ hasText: "confirmation link" }).waitFor();
  await page.goto(`${base}/donors`);
  await page.getByRole("heading", { name: "Sign in to view live donors." }).waitFor();
  assert.equal(await page.getByRole("table").count(), 0);
  await page.goto(`${base}/donors/00000000-0000-4000-8000-000000000002`);
  await page.getByRole("heading", { name: "Staff access required." }).waitFor();
  const fundingResponse = await page.goto(`${base}/donation-requests`);
  await page.getByRole("heading", { name: "Sign in to manage donation requests." }).waitFor();
  assert.doesNotMatch(await fundingResponse.text(), /AI Academy classroom essentials|Summer camp learning kits/);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/auth/sign-in`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.goto(`${base}/auth/register`);
  await page.getByRole("button", { name: "Register as staff", exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: "/tmp/hackleaf-staff-registration-mobile.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log("PASS staff registration/mismatch validation/fixed callback redirect/live sign-in UI/unauthenticated donor guards/direct URL denial/incomplete features fail closed/no serialized fixtures/mobile");
} finally { await browser.close(); }
