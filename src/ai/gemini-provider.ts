import type { AIProvider, GenerateInput, GenerateResult } from "./provider";
import { AIError } from "./ai-error";
import { GEMINI_DEFAULT_MODEL } from "./model-target";
import { readGeminiStream, readGeminiChunk } from "./gemini-stream";

export function geminiBody(input: GenerateInput) {
  const instructions = input.messages.filter(m => m.role === "system").map(m => ({ text: m.content }));
  return {
    ...(instructions.length ? { systemInstruction: { parts: instructions } } : {}),
    contents: input.messages.filter(m => m.role !== "system").map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    generationConfig: { temperature: input.temperature ?? 0.2, maxOutputTokens: 2048 },
  };
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  async healthCheck(): Promise<boolean> { return Boolean(process.env.GEMINI_API_KEY?.trim()); }
  async stream(input: GenerateInput, onDelta: (text: string) => void): Promise<GenerateResult> {
    return this.request(input, onDelta);
  }
  async generate(input: GenerateInput): Promise<GenerateResult> { return this.request(input); }

  private async request(input: GenerateInput, onDelta?: (text: string) => void): Promise<GenerateResult> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) throw new AIError("AI_NOT_CONFIGURED");
    const model = input.model?.trim() || GEMINI_DEFAULT_MODEL;
    const signal = AbortSignal.any([AbortSignal.timeout(45000), ...(input.signal ? [input.signal] : [])]);
    try {
      const method = onDelta ? "streamGenerateContent?alt=sse" : "generateContent";
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:${method}`, {
        method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": apiKey }, signal,
        body: JSON.stringify(geminiBody(input)),
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        if ([401, 403].includes(response.status)) throw new AIError("AI_AUTH_FAILED");
        if (response.status === 429) throw new AIError("AI_QUOTA_EXCEEDED");
        if (response.status === 404) throw new AIError("AI_MODEL_UNAVAILABLE");
        throw new AIError("AI_PROVIDER_FAILED");
      }
      if (onDelta) {
        if (!response.body) throw new AIError("AI_EMPTY_RESPONSE");
        return await readGeminiStream(response.body, onDelta, model);
      }
      const data = readGeminiChunk(await response.json());
      if (!data.text.trim()) throw new AIError("AI_EMPTY_RESPONSE");
      if (!data.completed) throw new AIError("AI_STREAM_INTERRUPTED");
      return { text: data.text, model: data.model || model, provider: this.name };
    } catch (error) {
      if (input.signal?.aborted) throw new AIError("AI_CANCELLED");
      if (error instanceof AIError) throw error;
      if (signal.aborted) throw new AIError("AI_TIMEOUT");
      throw new AIError("AI_PROVIDER_FAILED");
    }
  }
}
