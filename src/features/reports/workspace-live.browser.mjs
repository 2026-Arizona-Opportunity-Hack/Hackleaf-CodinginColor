import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

// Run against a separate server started with APP_DATA_MODE=live.
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const base = process.env.TEST_LIVE_BASE_URL ?? "http://127.0.0.1:3101";
  for (const path of ["/follow-ups", "/follow-ups?ownerId=member-2", "/reports", "/reports?donorId=00000000-0000-4000-8000-000000000002"]) {
    const response = await page.goto(`${base}${path}`);
    const html = await response.text();
    await page.getByRole("heading", { name: "Connect your live workspace." }).waitFor();
    assert.doesNotMatch(html, /Mesa Learning Fund|Jordan Ellis|donor1@example.org|fictional-2026-1/);
    assert.equal(await page.getByRole("button", { name: "Create demo next step" }).count(), 0);
    assert.equal(await page.getByRole("article", { name: "Funder packet preview" }).count(), 0);
  }
  console.log("PASS live setup guards exclude fixture UI and serialized donor data, including changed owner/donor URLs; live two-account authorization remains unimplemented");
} finally { await browser.close(); }
