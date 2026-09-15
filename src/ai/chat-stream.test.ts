import { afterEach, expect, it, vi } from "vitest";
import { readChatStream, streamChat } from "./chat-stream";
import { ModelRouter } from "./model-router";
import { AIError } from "./ai-error";
function body(value: string) {
  const bytes = new TextEncoder().encode(value);
  return new ReadableStream<Uint8Array>({ start(c) { for (const byte of bytes) c.enqueue(Uint8Array.of(byte)); c.close(); } });
}
const delta = (text: string) => `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\r\n\r\n`;
afterEach(() => vi.unstubAllGlobals());
it("decodes UTF-8 across byte boundaries and delivers real deltas", async () => {
  const chunks: string[] = [];
  const result = await readChatStream(body(': keepalive\n\n' + delta("Olá ") + delta("ação") + 'data: [DONE]\n\n'), text => chunks.push(text), "model", "gemini");
  expect(chunks).toEqual(["Olá ", "ação"]); expect(result.text).toBe("Olá ação");
});
it("rejects premature EOF instead of treating partial text as complete", async () => {
  await expect(readChatStream(body(delta("Incompleto")), () => {}, "m", "p")).rejects.toMatchObject({ code: "AI_STREAM_INTERRUPTED" });
});
it("does not accept an empty completed stream", async () => {
  await expect(readChatStream(body('data: [DONE]\n'), () => {}, "m", "p")).rejects.toMatchObject({ code: "AI_EMPTY_RESPONSE" });
});
it("does not switch models after any text was delivered", async () => {
  const backup = vi.fn();
  const router = new ModelRouter([{ name: "test", generate: backup, healthCheck: async () => true, stream: async (_, emit) => { emit("Trecho"); throw new AIError("AI_STREAM_INTERRUPTED"); } }, { name: "backup", generate: backup, stream: backup, healthCheck: async () => true }]);
  await expect(router.stream({ messages: [] }, [{ provider: "test" }, { provider: "backup" }], () => {})).rejects.toMatchObject({ code: "AI_STREAM_INTERRUPTED" });
  expect(backup).not.toHaveBeenCalled();
});
it("can use an explicit compatible fallback before streaming starts", async () => {
  const router = new ModelRouter([{ name: "test", generate: vi.fn(), healthCheck: async () => true, stream: async input => { if (input.model === "first") throw new AIError("AI_MODEL_UNAVAILABLE"); return { text: "OK", model: "second", provider: "test" }; } }]);
  expect((await router.stream({ messages: [] }, [{ provider: "test", model: "first" }, { provider: "test", model: "second" }], () => {})).text).toBe("OK");
});
it("reports Gemini quota without exposing provider details", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"error":{"message":"private"}}', { status: 429 })));
  await expect(streamChat({ messages: [] }, () => {}, { endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", apiKey: "test", model: "test", provider: "gemini" })).rejects.toMatchObject({ code: "AI_QUOTA_EXCEEDED" });
});
