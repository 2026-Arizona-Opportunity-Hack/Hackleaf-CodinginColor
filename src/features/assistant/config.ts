// Only these trusted endpoints may receive the server's provider credentials.
export function aiConfiguration() {
  const gatewayKey = process.env.OHACK_API_KEY?.trim();
  return gatewayKey ? {
    apiKey: gatewayKey, baseURL: "https://ai.ohack.dev/v1",
    model: process.env.OHACK_MODEL?.trim() || "gpt-oss-120b", provider: "OHack gateway",
  } : {
    apiKey: process.env.OPENAI_API_KEY?.trim(), baseURL: "https://api.openai.com/v1",
    model: process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini", provider: "OpenAI",
  };
}
export function aiConfigured(){return !!aiConfiguration().apiKey;}
export function demoAIEnabled(){return (process.env.APP_DATA_MODE==='live'||process.env.AI_DEMO_ENABLED==='true')&&aiConfigured();}
