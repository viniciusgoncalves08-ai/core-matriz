import { AIError } from "@/ai/ai-error";
import { AgentUnavailableError, respondAsNexus } from "./nexus-service";
export function nexusStreamResponse(params: { userId: string; conversationId: string; message: string; agentId?: string }, requestSignal: AbortSignal) {
  const controller = new AbortController();
  const signal = AbortSignal.any([requestSignal, controller.signal]);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(output) {
      const send = (data: object) => { if (!signal.aborted) output.enqueue(encoder.encode(JSON.stringify(data) + "\n")); };
      try {
        const result = await respondAsNexus({ ...params, signal, onDelta: text => send({ type: "delta", text }) });
        send({ type: "done", message: result.message });
      } catch (error) {
        send({ type: "error", error: error instanceof AIError || error instanceof AgentUnavailableError ? error.message : "Não foi possível concluir e salvar a resposta. Consulte o histórico antes de tentar novamente.", code: error instanceof AIError ? error.code : "NEXUS_FAILED" });
      } finally { if (!controller.signal.aborted) output.close(); }
    },
    cancel() { controller.abort(); },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
}
