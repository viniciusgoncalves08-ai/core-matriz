import { AIError } from "./ai-error";
import type { GenerateResult } from "./provider";

type GeminiChunk = {
  error?: unknown;
  promptFeedback?: { blockReason?: string };
  modelVersion?: string;
  candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
};

export function readGeminiChunk(data: GeminiChunk) {
  if (!data || data.error) throw new AIError("AI_PROVIDER_FAILED");
  if (data.promptFeedback?.blockReason) throw new AIError("AI_EMPTY_RESPONSE");
  const candidate = data.candidates?.[0];
  if (candidate?.finishReason === "MAX_TOKENS") throw new AIError("AI_OUTPUT_LIMIT");
  if (candidate?.finishReason && candidate.finishReason !== "STOP") throw new AIError("AI_EMPTY_RESPONSE");
  const text = (candidate?.content?.parts ?? []).filter(part => !part.thought && typeof part.text === "string").map(part => part.text).join("");
  if (text.length > 200000) throw new AIError("AI_OUTPUT_LIMIT");
  return { text, completed: candidate?.finishReason === "STOP", model: data.modelVersion };
}

export async function readGeminiStream(body: ReadableStream<Uint8Array>, onDelta: (text: string) => void, model: string): Promise<GenerateResult> {
  const reader = body.getReader(), decoder = new TextDecoder();
  let buffer = "", event = "", text = "", completed = false;
  function dispatch() {
    if (!event.trim()) return;
    const chunk = readGeminiChunk(JSON.parse(event)); event = "";
    if (chunk.model) model = chunk.model;
    text += chunk.text;
    if (text.length > 200000) throw new AIError("AI_OUTPUT_LIMIT");
    if (chunk.text) onDelta(chunk.text);
    completed = chunk.completed;
  }
  function line(value: string) {
    if (!value) dispatch();
    else if (value.startsWith("data:")) event += value.slice(5).trimStart() + "\n";
    if (event.length > 1000000) throw new AIError("AI_PROVIDER_FAILED");
  }
  try {
    while (!completed) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      let end;
      while (!completed && (end = buffer.indexOf("\n")) !== -1) { line(buffer.slice(0, end).replace(/\r$/, "")); buffer = buffer.slice(end + 1); }
      if (buffer.length > 1000000) throw new AIError("AI_PROVIDER_FAILED");
      if (chunk.done) { if (buffer.trim()) line(buffer.replace(/\r$/, "")); if (!completed) dispatch(); break; }
    }
    if (!completed) throw new AIError("AI_STREAM_INTERRUPTED");
    if (!text.trim()) throw new AIError("AI_EMPTY_RESPONSE");
    return { text, model, provider: "gemini" };
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
