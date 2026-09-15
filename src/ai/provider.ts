export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GenerateInput = {
  model?: string;
  signal?: AbortSignal;
  messages: AIMessage[];
  temperature?: number;
};

export type GenerateResult = {
  text: string;
  model: string;
  provider: string;
};

export interface AIProvider {
  readonly name: string;
  generate(input: GenerateInput): Promise<GenerateResult>;
  stream?(input: GenerateInput, onDelta: (text: string) => void): Promise<GenerateResult>;
  healthCheck(): Promise<boolean>;
}
