import { AIError } from "./ai-error";
import type { GenerateInput, GenerateResult } from "./provider";

export async function streamChat(input: GenerateInput, onDelta: (text: string) => void, config: { endpoint: string; apiKey?: string; model: string; provider: string; options?: object }): Promise<GenerateResult> {
  if (!config.apiKey?.trim()) throw new AIError("AI_NOT_CONFIGURED");
  const signal = AbortSignal.any([AbortSignal.timeout(45000), ...(input.signal ? [input.signal] : [])]);
  try {
    const response = await fetch(config.endpoint, {
      method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey.trim()}` }, signal,
      body: JSON.stringify({ model: config.model, messages: input.messages, ...config.options, stream: true }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      if ([401, 403].includes(response.status)) throw new AIError("AI_AUTH_FAILED");
      if (data?.error?.code === "insufficient_quota" || (config.provider === "gemini" && response.status === 429)) throw new AIError("AI_QUOTA_EXCEEDED");
      if (response.status === 429) throw new AIError("AI_RATE_LIMITED");
      if (response.status === 404) throw new AIError("AI_MODEL_UNAVAILABLE");
      throw new AIError("AI_PROVIDER_FAILED");
    }
    if (!response.body) throw new AIError("AI_EMPTY_RESPONSE");
    return await readChatStream(response.body, onDelta, config.model, config.provider);
  } catch (error) {
    if (input.signal?.aborted) throw new AIError("AI_CANCELLED");
    if (error instanceof AIError) throw error;
    if (signal.aborted) throw new AIError("AI_TIMEOUT");
    throw new AIError("AI_PROVIDER_FAILED");
  }
}

export async function readChatStream(body: ReadableStream<Uint8Array>, onDelta: (text: string) => void, model: string, provider: string): Promise<GenerateResult> {
  const reader = body.getReader(); const decoder = new TextDecoder();
  let buffer = "", text = "", completed = false;
  function line(value: string) {
    if (!value.startsWith("data:")) return;
    const payload = value.slice(5).trim();
    if (payload === "[DONE]") { completed = true; return; }
    if (!payload) return;
    const data = JSON.parse(payload);
    if (data.error) throw new AIError("AI_PROVIDER_FAILED");
    const choice = data.choices?.[0];
    if (choice?.finish_reason === "length") throw new AIError("AI_OUTPUT_LIMIT");
    if (choice?.finish_reason === "content_filter") throw new AIError("AI_EMPTY_RESPONSE");
    const delta = choice?.delta?.content;
    if (typeof data.model === "string") model = data.model;
    if (typeof delta === "string" && delta) {
      text += delta;
      if (text.length > 200000) throw new AIError("AI_OUTPUT_LIMIT");
      onDelta(delta);
    }
  }
  try {
    while (!completed) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      let end;
      while (!completed && (end = buffer.indexOf("\n")) !== -1) { line(buffer.slice(0, end).replace(/\r$/, "")); buffer = buffer.slice(end + 1); }
      if (buffer.length > 1000000) throw new AIError("AI_PROVIDER_FAILED");
      if (chunk.done) { if (buffer.trim() && !completed) line(buffer.trim()); break; }
    }
    if (!completed) throw new AIError("AI_STREAM_INTERRUPTED");
    if (!text.trim()) throw new AIError("AI_EMPTY_RESPONSE");
    return { text, model, provider };
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
