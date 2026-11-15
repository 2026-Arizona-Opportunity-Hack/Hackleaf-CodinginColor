import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), maybeSingle: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./server", () => ({ createSupabaseServerClient: async () => ({ auth: { getUser: mocks.getUser }, from: mocks.from }) }));
import { getLiveStaff, isActiveStaff } from "./member";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
});

it("requires active database membership rather than a role supplied in auth metadata", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: "verified-user", user_metadata: { role: "admin" } } }, error: null });
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  expect((await getLiveStaff()).status).toBe("forbidden");
  expect(mocks.eq).toHaveBeenCalledWith("id", "verified-user");
});

it("does not query private records for a missing or invalid session", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid") });
  expect(await getLiveStaff()).toEqual({ status: "signed_out" });
  expect(mocks.from).not.toHaveBeenCalled();
});

it("distinguishes membership query failures from permission decisions", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: "verified-user" } }, error: null });
  mocks.maybeSingle.mockResolvedValue({ data: null, error: new Error("network") });
  expect((await getLiveStaff()).status).toBe("unavailable");
  mocks.maybeSingle.mockResolvedValue({ data: { id: "verified-user", role: "admin", active: true }, error: null });
  expect((await getLiveStaff()).status).toBe("authorized");
});

it("rejects disabled and non-staff memberships", () => {
  expect(isActiveStaff(null)).toBe(false);
  expect(isActiveStaff({ role: "admin", active: false })).toBe(false);
  expect(isActiveStaff({ role: "donor", active: true })).toBe(false);
  expect(isActiveStaff({ role: "board_member", active: true })).toBe(true);
});

it("does not mistake a temporary Auth outage for a signed-out session", async () => {
  mocks.getUser.mockResolvedValue({data:{user:null},error:{status:503,name:"AuthRetryableFetchError"}});
  expect((await getLiveStaff()).status).toBe("unavailable");
  expect(mocks.from).not.toHaveBeenCalled();
});

it("identifies missing and inactive memberships without confusing them with logout", async () => {
  mocks.getUser.mockResolvedValue({data:{user:{id:"verified-user"}},error:null});
  mocks.maybeSingle.mockResolvedValue({data:null,error:null});
  expect(await getLiveStaff()).toMatchObject({status:"forbidden",restriction:"missing_membership",user:{id:"verified-user"}});
  mocks.maybeSingle.mockResolvedValue({data:{id:"verified-user",role:"admin",active:false},error:null});
  expect(await getLiveStaff()).toMatchObject({status:"forbidden",restriction:"inactive_membership"});
});
