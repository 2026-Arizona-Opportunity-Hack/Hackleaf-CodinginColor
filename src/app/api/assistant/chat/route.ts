import { chatRequestSchema, type AssistantEvent } from "@/features/assistant/contracts";
import { createContext, AssistantFailure } from "@/features/assistant/server-context";
import { boundedJson, consumeRate, sameOrigin } from "@/features/assistant/security";
import { runAssistant } from "@/features/assistant/engine";
import { openAIProvider, providerError } from "@/features/assistant/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = chatRequestSchema.safeParse(await boundedJson(request));
    if (!body.success) return Response.json({ error: "Check your message, attachment and workspace data; or start a new chat if it is too large." }, { status: 400 });
    const context = await createContext(request, body.data.path, body.data.demo);
    context.attachment = body.data.attachment;
    if (!process.env.OPENAI_API_KEY?.trim()) throw new AssistantFailure("OPENAI_API_KEY is not configured on the server.", 503);
    if (!consumeRate(`chat:${context.actor.id}`, 6, 60000)) throw new AssistantFailure("Please wait a minute before sending more messages.", 429);
    if (context.actor.mode === "demo") {
      if (!consumeRate("demo-global-day", 120, 86400000)) throw new AssistantFailure("The demo’s daily AI request allowance is used up.", 429);
    } else {
      const budget = await context.db!.rpc("assistant_reserve_turn");
      if (budget.error) throw new AssistantFailure("Apply the assistant database migration before enabling live AI requests.", 503);
      if (!budget.data) throw new AssistantFailure("The workspace’s daily AI request allowance is used up.", 429);
    }
    const cancelled = new AbortController();
    const signal = AbortSignal.any([request.signal, cancelled.signal, AbortSignal.timeout(55000)]);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const emit = (event: AssistantEvent) => { if (!signal.aborted) controller.enqueue(encoder.encode(JSON.stringify(event) + "\n")); };
        try { await runAssistant(context, body.data.messages, body.data.path, openAIProvider(), emit, signal); }
        catch (error) { emit({ type: "error", message: providerError(error) }); }
        finally { if (!cancelled.signal.aborted) controller.close(); }
      },
      cancel() { cancelled.abort(); },
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "private, no-store, no-transform", "X-Accel-Buffering": "no" } });
  } catch (error) {
    return Response.json({ error: error instanceof AssistantFailure ? error.message : "The request was invalid or came from another website." }, { status: error instanceof AssistantFailure ? error.status : 400, headers: { "Cache-Control": "private, no-store" } });
  }
}
