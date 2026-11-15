import { confirmRequestSchema } from "@/features/assistant/contracts";
import { createContext, AssistantFailure } from "@/features/assistant/server-context";
import { boundedJson, canonical, consumeRate, sameOrigin, verifyProposal } from "@/features/assistant/security";
import { assertCanUse } from "@/features/assistant/policy";
import { actionBefore, applyDemoAction } from "@/features/assistant/demo-state";

const state = globalThis as typeof globalThis & { __hackleafAIReceipts?: Map<string, { actor: string; expires: number }> };
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = confirmRequestSchema.parse(await boundedJson(request));
    const context = await createContext(request, body.path, body.demo);
    if (!consumeRate(`apply:${context.actor.id}`, 20, 60000)) throw new AssistantFailure("Please wait a minute before applying more changes.", 429);
    const proposal = verifyProposal(body.token, context.actor);
    assertCanUse(context.actor, proposal.action.name);
    if (context.actor.mode === "demo") {
      if (!context.snapshot) throw new AssistantFailure("Demo state is unavailable.");
      const receipts = state.__hackleafAIReceipts ??= new Map();
      for (const [id, receipt] of receipts) if (receipt.expires <= Date.now()) receipts.delete(id);
      const previous = receipts.get(proposal.id);
      if (previous?.actor === context.actor.id) return Response.json({ id: proposal.id, action: proposal.action, mode: "demo", replayed: true }, { headers: { "Cache-Control": "private, no-store" } });
      if (canonical(actionBefore(context.snapshot, proposal.action)) !== canonical(proposal.before)) throw new AssistantFailure("This record changed since the proposal. Ask the assistant to prepare it again.", 409);
      applyDemoAction(context.snapshot, proposal.action, proposal.id, context.actor.today);
      receipts.set(proposal.id, { actor: context.actor.id, expires: proposal.expiresAt });
      return Response.json({ id: proposal.id, action: proposal.action, mode: "demo", replayed: false }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const result = await context.db!.rpc("assistant_apply_action", { p_id: proposal.id, p_operation: proposal.action.name, p_input: proposal.action.input, p_before: proposal.before });
    if (result.error) throw new AssistantFailure("The change was not applied. The record may have changed, your access may have changed, or the assistant migration is missing. Refresh and prepare it again.", 409);
    return Response.json({ id: proposal.id, mode: "live", result: result.data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error && error.name !== "ZodError" ? error.message : "The review request is invalid." }, { status: error instanceof AssistantFailure ? error.status : 400, headers: { "Cache-Control": "private, no-store" } });
  }
}
