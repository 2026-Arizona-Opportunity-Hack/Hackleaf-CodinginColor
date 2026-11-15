import type { AssistantEvent } from "./contracts";

export async function readAssistantStream(response: Response, onEvent: (event: AssistantEvent) => void) {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "The assistant is unavailable. Please try again.");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("The assistant connection did not open.");
  const decoder = new TextDecoder();
  let buffer = "", completed = false;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      if (buffer.length > 150000) throw new Error("The assistant response was too large.");
      let end: number;
      while ((end = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        if (!line.trim()) continue;
        const event = JSON.parse(line) as AssistantEvent;
        if (event.type === "done" || event.type === "error") completed = true;
        onEvent(event);
      }
    }
    if (!completed) throw new Error("The connection ended early. Retry your request; unapplied actions remain proposals.");
  } finally { reader.releaseLock(); }
}
