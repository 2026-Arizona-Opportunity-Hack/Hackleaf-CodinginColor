import { createContext, AssistantFailure } from "@/features/assistant/server-context";
import { newSession, sessionFor } from "@/features/assistant/security";
import { aiConfigured } from "@/features/assistant/config";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const headers: Record<string, string> = { "Cache-Control": "private, no-store" };
  try {
    const existing = sessionFor(request);
    const created = existing ? null : newSession();
    const session = existing ?? created!.id;
    const context = await createContext(request, new URL(request.url).searchParams.get("path") ?? "/", null, session);
    if (created) headers["Set-Cookie"] = created.cookie;
    const ready = aiConfigured();
    return Response.json({ ready, mode: context.actor.mode, message: ready ? "Ready to help with your workspace." : "Configure OHACK_API_KEY or OPENAI_API_KEY on the server, then restart. Never paste a key into chat." }, { headers });
  } catch (error) {
    return Response.json({ ready: false, message: error instanceof AssistantFailure ? error.message : "Assistant setup is incomplete. Check the server’s assistant configuration." }, { status: error instanceof AssistantFailure ? error.status : 503, headers });
  }
}
