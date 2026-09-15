import type { AIProvider, GenerateInput, GenerateResult } from "./provider";
import { AIError } from "./ai-error";
import { GEMINI_DEFAULT_MODEL } from "./model-target";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  async healthCheck(): Promise<boolean> { return Boolean(process.env.GEMINI_API_KEY?.trim()); }
  async generate(input: GenerateInput): Promise<GenerateResult> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) throw new AIError("AI_NOT_CONFIGURED");
    const model = input.model?.trim() || GEMINI_DEFAULT_MODEL;
    try {
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({ model, messages: input.messages, temperature: input.temperature ?? 0.2, max_tokens: 2048 }),
      });
      const data = await response.json().catch(() => null) as {
        error?: { code?: string }; choices?: Array<{ message?: { content?: string } }>; model?: string;
      } | null;
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new AIError("AI_AUTH_FAILED");
        if (data?.error?.code === "insufficient_quota") throw new AIError("AI_QUOTA_EXCEEDED");
        if (response.status === 429) throw new AIError("AI_QUOTA_EXCEEDED");
        if (data?.error?.code === "model_not_found" || response.status === 404) throw new AIError("AI_MODEL_UNAVAILABLE");
        throw new AIError("AI_PROVIDER_FAILED");
      }
      const text = data?.choices?.[0]?.message?.content;
      if (typeof text !== "string" || !text.trim()) throw new AIError("AI_EMPTY_RESPONSE");
      return { text, model: data?.model || model, provider: this.name };
    } catch (error) {
      if (error instanceof AIError) throw error;
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) throw new AIError("AI_TIMEOUT");
      throw new AIError("AI_PROVIDER_FAILED");
    }
  }
}
