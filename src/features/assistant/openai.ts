import "server-only";
import OpenAI from "openai";
import type { ModelProvider } from "./engine";
import { aiConfiguration } from "./config";

export function openAIProvider(): ModelProvider {
  const config = aiConfiguration();
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL, maxRetries: config.provider === "OHack gateway" ? 1 : 0, timeout: config.provider === "OHack gateway" ? 25000 : 55000 });
  return async (input, tools, instructions, delta, signal) => {
    const model = config.model;
    // Some gateway backends drop empty properties. Give no-argument tools an
    // inert wire-only parameter, then remove it before authoritative validation.
    const noArgumentTools = new Set<string>();
    const providerTools = config.provider === "OHack gateway" ? tools.map(tool => {
      const parameters = tool.parameters;
      if (parameters?.properties && !Object.keys(parameters.properties as object).length) {
        noArgumentTools.add(tool.name);
        return { ...tool, parameters: { type: "object", properties: { _gateway_no_args: { type: "boolean", enum: [true], description: "Always true; this tool takes no user arguments." } }, required: ["_gateway_no_args"], additionalProperties: false } };
      }
      return tool;
    }) : tools;
    const stream = await client.responses.create({
      model, instructions, input, tools: providerTools, stream: true, store: false,
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
    return { output: response.output, calls: response.output.flatMap((item) => item.type === "function_call" ? [{ id: item.call_id, name: item.name, arguments: noArgumentTools.has(item.name) ? "{}" : item.arguments }] : []), inputTokens: response.usage?.input_tokens ?? 0, outputTokens: response.usage?.output_tokens ?? 0 };
  };
}

export function providerError(error: unknown) {
  const provider = aiConfiguration().provider;
  if (error instanceof OpenAI.APIError) {
    if (error.status === 401 || error.status === 403) return `${provider} rejected the credentials or model access. Check the server key, model and key expiration.`;
    if (error.status === 429) return `${provider}'s rate or credit limit was reached. Check the team's remaining budget and retry later.`;
    if (error.status === 400 || error.status === 404) return `${provider} rejected the model or tool configuration. Check the server's model setting.`;
    return `${provider} is temporarily unavailable. Your unapplied changes are still only proposals. Please retry.`;
  }
  if (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)) return "This response was stopped or timed out. Any unapplied action is still only a proposal.";
  return "I couldn’t finish this response. Try again or ask for a smaller task. Nothing is changed without applying a review card.";
}
