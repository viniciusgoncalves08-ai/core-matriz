import { expect, it } from "vitest";
import { readGeminiStream, readGeminiChunk } from "./gemini-stream";
function body(payload: string) {
  const bytes = new TextEncoder().encode(payload);
  return new ReadableStream<Uint8Array>({ start(controller) { for (const byte of bytes) controller.enqueue(Uint8Array.of(byte)); controller.close(); } });
}
const event = (text: string, finishReason?: string) => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason }] })}\r\n\r\n`;
it("decodes fragmented UTF8 and completes on native STOP without OpenAI DONE", async () => {
  const deltas: string[] = [];
  expect(await readGeminiStream(body(event("Olá ")+event("Vinícius", "STOP")), t => deltas.push(t), "test")).toEqual({ text: "Olá Vinícius", model: "test", provider: "gemini" });
  expect(deltas.join("")).toBe("Olá Vinícius");
});
it("rejects truncated streams so partial answers cannot be persisted", async () => {
  await expect(readGeminiStream(body(event("Parcial")), () => {}, "test")).rejects.toMatchObject({ code: "AI_STREAM_INTERRUPTED" });
});
it("does not expose thought parts", () => {
  expect(readGeminiChunk({ candidates: [{ content: { parts: [{ text: "internal", thought: true }, { text: "answer" }] }, finishReason: "STOP" }] }).text).toBe("answer");
});
it.each([["MAX_TOKENS", "AI_OUTPUT_LIMIT"], ["SAFETY", "AI_EMPTY_RESPONSE"]])("rejects incomplete completion %s", (finishReason, code) => {
  expect(() => readGeminiChunk({ candidates: [{ finishReason }] })).toThrow(expect.objectContaining({ code }));
});
