import type { AIProvider, GenerateInput, GenerateResult } from "./provider";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";

  async healthCheck(): Promise<boolean> {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  async generate(input: GenerateInput): Promise<GenerateResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY não configurada.");

    const model = input.model ?? process.env.AI_DEFAULT_MODEL ?? "gpt-5";
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: input.messages,
        temperature: input.temperature ?? 0.2,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Falha no provider OpenAI (${response.status}): ${body}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      model?: string;
    };

    return {
      text: data.choices?.[0]?.message?.content ?? "",
      model: data.model ?? model,
      provider: this.name,
    };
  }
}
