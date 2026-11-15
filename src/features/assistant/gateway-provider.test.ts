import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ create: vi.fn(), options: vi.fn() }));
vi.mock("openai", () => ({ default: class { constructor(options: unknown) { mocks.options(options); } responses = { create: mocks.create }; } }));
import { openAIProvider } from "./openai";
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it("adapts empty gateway tool schemas without leaking wire parameters to domain tools", async () => {
  vi.stubEnv("OHACK_API_KEY", "gateway-test");
  mocks.create.mockResolvedValue((async function* () {
    yield { type: "response.completed", response: { output: [{ type: "function_call", call_id: "call-1", name: "board_workload", arguments: '{"_gateway_no_args":true}' }] } };
  })());
  const result = await openAIProvider()([], [{ type: "function", name: "board_workload", description: "Workload", strict: true, parameters: { type: "object", properties: {}, required: [] } }], "Help staff", () => {}, new AbortController().signal);
  expect(mocks.options).toHaveBeenCalledWith(expect.objectContaining({ baseURL: "https://ai.ohack.dev/v1", apiKey: "gateway-test" }));
  expect(mocks.create.mock.calls[0][0].tools[0].parameters).toMatchObject({ properties: { _gateway_no_args: { type: "boolean" } }, required: ["_gateway_no_args"] });
  expect(result.calls).toEqual([{ id: "call-1", name: "board_workload", arguments: "{}" }]);
});
