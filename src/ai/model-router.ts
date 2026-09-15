import { AIError } from "./ai-error";
import type { AIProvider, GenerateInput, GenerateResult } from "./provider";
import { GeminiProvider } from "./gemini-provider";
import { OpenAIProvider } from "./openai-provider";

export type ModelTarget = {
  provider: string;
  model?: string;
};

export class ModelRouter {
  private readonly providers = new Map<string, AIProvider>();

  constructor(initialProviders: AIProvider[] = [new OpenAIProvider(), new GeminiProvider()]) {
    for (const provider of initialProviders) this.providers.set(provider.name, provider);
  }

  async stream(input: Omit<GenerateInput, "model">, targets: ModelTarget[], onDelta: (text: string) => void): Promise<GenerateResult> {
    let lastError = new AIError("AI_NOT_CONFIGURED");
    let emitted = false;
    for (const target of targets) {
      if (input.signal?.aborted) throw new AIError("AI_CANCELLED");
      const provider = this.providers.get(target.provider);
      if (!provider?.stream || !await provider.healthCheck()) continue;
      try {
        return await provider.stream({ ...input, model: target.model }, text => { emitted = true; onDelta(text); });
      } catch (error) {
        lastError = error instanceof AIError ? error : new AIError("AI_PROVIDER_FAILED");
        // Never mix partial answers from different models or retry after cancellation.
        if (emitted || input.signal?.aborted) throw lastError;
      }
    }
    throw lastError;
  }

  register(provider: AIProvider) {
    this.providers.set(provider.name, provider);
  }

  async generate(input: Omit<GenerateInput, "model">, targets: ModelTarget[]): Promise<GenerateResult> {
    let lastError = new AIError("AI_NOT_CONFIGURED");

    for (const target of targets) {
      const provider = this.providers.get(target.provider);
      if (!provider) {
        lastError = new AIError("AI_NOT_CONFIGURED");
        continue;
      }

      try {
        if (!(await provider.healthCheck())) {
          lastError = new AIError("AI_NOT_CONFIGURED");
          continue;
        }
        return await provider.generate({ ...input, model: target.model });
      } catch (error) {
        lastError = error instanceof AIError ? error : new AIError("AI_PROVIDER_FAILED");
      }
    }

    throw lastError;
  }
}

export const modelRouter = new ModelRouter();
