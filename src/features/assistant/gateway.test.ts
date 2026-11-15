import { afterEach, expect, it, vi } from "vitest";
import { aiConfiguration, aiConfigured, demoAIEnabled } from "./config";
afterEach(() => vi.unstubAllEnvs());
it("prefers the sponsored key without sending the OpenAI key to the gateway", () => {
  vi.stubEnv("OHACK_API_KEY", "gateway-test"); vi.stubEnv("OPENAI_API_KEY", "openai-test"); vi.stubEnv("OHACK_MODEL", "");
  expect(aiConfiguration()).toMatchObject({ apiKey: "gateway-test", baseURL: "https://ai.ohack.dev/v1", model: "gpt-oss-120b" });
  expect(aiConfigured()).toBe(true);
});
it("retains direct OpenAI configuration when no gateway key exists", () => {
  vi.stubEnv("OHACK_API_KEY", " "); vi.stubEnv("OPENAI_API_KEY", "openai-test");
  expect(aiConfiguration()).toMatchObject({ apiKey: "openai-test", baseURL: "https://api.openai.com/v1" });
});
it("accepts a gateway-only key and preserves the explicit demo opt-in", () => {
  vi.stubEnv("OHACK_API_KEY", "gateway-test"); vi.stubEnv("OPENAI_API_KEY", ""); vi.stubEnv("AI_DEMO_ENABLED", "false");
  expect(aiConfigured()).toBe(true); expect(demoAIEnabled()).toBe(false);
  vi.stubEnv("AI_DEMO_ENABLED", "true"); expect(demoAIEnabled()).toBe(true);
});
