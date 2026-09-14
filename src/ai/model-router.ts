import type { AIProvider, GenerateInput, GenerateResult } from "./provider";
import { OpenAIProvider } from "./openai-provider";

export type ModelTarget = {
  provider: string;
  model?: string;
};

export class ModelRouter {
  private readonly providers = new Map<string, AIProvider>();

  constructor(initialProviders: AIProvider[] = [new OpenAIProvider()]) {
    for (const provider of initialProviders) this.providers.set(provider.name, provider);
  }

  register(provider: AIProvider) {
    this.providers.set(provider.name, provider);
  }

  async generate(input: Omit<GenerateInput, "model">, targets: ModelTarget[]): Promise<GenerateResult> {
    const errors: string[] = [];

    for (const target of targets) {
      const provider = this.providers.get(target.provider);
      if (!provider) {
        errors.push(`${target.provider}: provider não registrado`);
        continue;
      }

      try {
        if (!(await provider.healthCheck())) {
          errors.push(`${target.provider}: indisponível`);
          continue;
        }
        return await provider.generate({ ...input, model: target.model });
      } catch (error) {
        errors.push(`${target.provider}: ${error instanceof Error ? error.message : "erro desconhecido"}`);
      }
    }

    throw new Error(`Nenhum modelo disponível. ${errors.join(" | ")}`);
  }
}

export const modelRouter = new ModelRouter();
