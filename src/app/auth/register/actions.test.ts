import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ signUp: vi.fn(), from: vi.fn(), isDemo: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { signUp: mocks.signUp }, from: mocks.from }) }));
vi.mock("@/lib/workspace", () => ({ isDemoWorkspace: mocks.isDemo }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ origin: "http://127.0.0.1:3102" }) }));
import { registerStaff } from "./actions";

function form(extra: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ displayName: "Fictional Staff", email: "staff@example.org", password: "Fictional-pass-123", confirmPassword: "Fictional-pass-123", ...extra })) data.set(key, value);
  return data;
}
const initial = { error: "", message: "" };
beforeEach(() => { vi.clearAllMocks(); mocks.isDemo.mockReturnValue(false); });

it("validates matching passwords before contacting Supabase", async () => {
  expect((await registerStaff(initial, form({ confirmPassword: "Another-pass-123" }))).error).toContain("matching passwords");
  expect(mocks.signUp).not.toHaveBeenCalled();
});
it("registers only display metadata and never provisions a privileged membership", async () => {
  mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
  const result = await registerStaff(initial, form({ role: "admin", active: "true" }));
  expect(result.message).toContain("Check your email");
  expect(mocks.signUp).toHaveBeenCalledWith({ email: "staff@example.org", password: "Fictional-pass-123", options: { data: { display_name: "Fictional Staff" }, emailRedirectTo: "http://127.0.0.1:3102/auth/callback" } });
  expect(mocks.from).not.toHaveBeenCalled();
});
it("keeps access pending even when Supabase returns a session", async () => {
  mocks.signUp.mockResolvedValue({ data: { session: { access_token: "synthetic-test-token" } }, error: null });
  expect((await registerStaff(initial, form())).message).toContain("pending project-owner approval");
  expect(mocks.from).not.toHaveBeenCalled();
});
it("shows a useful disabled-signup error without leaking account details", async () => {
  mocks.signUp.mockResolvedValue({ data: null, error: { code: "signup_disabled" } });
  expect((await registerStaff(initial, form())).error).toContain("Registration is disabled");
});
it("does not contact the live project from demo mode", async () => {
  mocks.isDemo.mockReturnValue(true);
  expect((await registerStaff(initial, form())).error).toContain("live mode");
  expect(mocks.signUp).not.toHaveBeenCalled();
});
