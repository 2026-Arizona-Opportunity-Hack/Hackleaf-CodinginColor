import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(`${process.env.TEST_BASE_URL ?? "http://127.0.0.1:3102"}/donation-requests`);
  for (const priority of [1, 2, 3, 4]) assert.equal(await page.getByText(`Priority ${priority}`, { exact: true }).count(), 1);
  await page.getByRole("button", { name: "Make a donation request", exact: true }).click();
  const dialog = page.getByRole("dialog");
  assert.equal(await dialog.getByLabel("Funding priority").count(), 0);
  await dialog.getByLabel("Donation title").fill("Unique queued request");
  await dialog.getByLabel("Amount required").fill("100");
  await dialog.getByLabel("What is the donation for?").fill("A fictional request with its own position in the funding queue.");
  await dialog.getByRole("button", { name: "Create request", exact: true }).click();
  const queued = page.getByRole("article", { name: "Unique queued request", exact: true });
  assert.match(await queued.innerText(), /Priority 5/);
  await queued.getByRole("button", { name: "Edit Unique queued request", exact: true }).click();
  assert.equal(await dialog.getByLabel("Funding priority").count(), 0);
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  assert.match(await queued.innerText(), /Priority 5/);
  const current = page.getByRole("article", { name: "Laptops for hands-on learning", exact: true });
  const next = page.getByRole("article", { name: "Open doors to summer camp", exact: true });
  async function donate(donor, amount) {
    await page.getByRole("button", { name: "Record a demo donation", exact: true }).click();
    await dialog.getByLabel("Demo donor").selectOption({ label: donor });
    await dialog.getByLabel("Donation amount (USD)").fill(amount);
    await dialog.getByRole("button", { name: "Record demo donation", exact: true }).click();
  }
  await donate("Jordan Ellis", "20");
  await donate("Alex Rivera", "10");
  assert.match(await current.innerText(), /\$1,280 raised of \$5,000/);
  assert.match(await next.innerText(), /\$0 raised of \$8,000/);
  assert.match(await queued.innerText(), /\$0 raised of \$100/);
  await current.click();
  assert.match(await dialog.innerText(), /Jordan Ellis[\s\S]*\$20 allocated/);
  assert.match(await dialog.innerText(), /Alex Rivera[\s\S]*\$10 allocated/);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await dialog.evaluate((element) => element.scrollWidth <= innerWidth), true);
  await page.keyboard.press("Escape");
  await donate("Mesa Learning Fund", "4000");
  assert.match(await current.innerText(), /\$5,000 raised of \$5,000/);
  assert.match(await next.innerText(), /\$4,280 raised of \$8,000/);
  assert.match(await queued.innerText(), /\$0 raised of \$100/);
  for (const priority of [1, 2, 3, 4, 5]) assert.equal(await page.getByText(`Priority ${priority}`, { exact: true }).count(), 1);
  assert.deepEqual(errors, []);
  console.log("PASS unique priorities 1–5; automatic unused default; priority absent from form; automatic priority retained on edit; donor sums and overflow; mobile; no browser errors");
} finally { await browser.close(); }
