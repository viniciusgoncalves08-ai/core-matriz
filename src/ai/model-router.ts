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
