export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type GenerateInput = {
  model?: string;
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
  healthCheck(): Promise<boolean>;
}
