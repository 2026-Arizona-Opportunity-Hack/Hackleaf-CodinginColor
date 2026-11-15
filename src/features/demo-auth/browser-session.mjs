export async function loginDemo(page,base="http://127.0.0.1:3102",role="admin") {
  await page.goto(`${base}/auth/sign-in`);
  await page.getByLabel("Email",{exact:true}).fill(`${role}@hackleaf.demo`);
  await page.getByLabel("Password",{exact:true}).fill(role==="admin"?"DemoAdmin!2026":"DemoStaff!2026");
  await page.getByRole("button",{name:"Sign in",exact:true}).click();
  await page.waitForURL("**/dashboard");
}
