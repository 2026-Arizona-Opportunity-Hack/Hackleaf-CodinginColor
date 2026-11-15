import "server-only";
import OpenAI from "openai";
import type { ModelProvider } from "./engine";

export function openAIProvider(): ModelProvider {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY?.trim(), baseURL: "https://api.openai.com/v1", maxRetries: 0, timeout: 55000 });
  return async (input, tools, instructions, delta, signal) => {
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini";
    const stream = await client.responses.create({
      model, instructions, input, tools, stream: true, store: false,
      max_output_tokens: 2200, parallel_tool_calls: true,
      ...(model.startsWith("gpt-5") || model.startsWith("gpt-6") ? { reasoning: { effort: "low" as const } } : {}),
    }, { signal });
    let completed: Extract<OpenAI.Responses.ResponseStreamEvent, { type: "response.completed" }> | undefined;
    for await (const event of stream) {
      if (event.type === "response.output_text.delta") delta(event.delta);
      if (event.type === "response.completed") completed = event;
      if (event.type === "response.failed" || event.type === "response.incomplete" || event.type === "error") throw new Error("The model could not complete this turn. Try a shorter request.");
    }
    if (!completed) throw new Error("The model connection ended early. Please retry.");
    const response = completed.response;
    return { output: response.output, calls: response.output.flatMap((item) => item.type === "function_call" ? [{ id: item.call_id, name: item.name, arguments: item.arguments }] : []), inputTokens: response.usage?.input_tokens ?? 0, outputTokens: response.usage?.output_tokens ?? 0 };
  };
}

export function providerError(error: unknown) {
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401 || error.status === 403) return "OpenAI rejected the server’s credentials or model access. Check the configured key and model.";
    if (error.status === 429) return "OpenAI’s rate or credit limit was reached. Please check the project’s usage settings and try again later.";
    if (error.status === 400 || error.status === 404) return "OpenAI rejected the model or tool configuration. Check OPENAI_MODEL and the server integration.";
    return "OpenAI is temporarily unavailable. Your unapplied changes are still only proposals. Please retry.";
  }
  if (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)) return "This response was stopped or timed out. Any unapplied action is still only a proposal.";
  return "I couldn’t finish this response. Try again or ask for a smaller task. Nothing is changed without applying a review card.";
}
