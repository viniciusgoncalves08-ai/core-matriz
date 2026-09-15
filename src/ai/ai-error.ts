export type AIErrorCode = "AI_NOT_CONFIGURED" | "AI_AUTH_FAILED" | "AI_QUOTA_EXCEEDED" | "AI_RATE_LIMITED" | "AI_MODEL_UNAVAILABLE" | "AI_TIMEOUT" | "AI_PROVIDER_FAILED" | "AI_EMPTY_RESPONSE";
const messages: Record<AIErrorCode, string> = {
  AI_NOT_CONFIGURED: "A conexão de IA ainda não foi configurada. Configure a chave da API para ativar o Nexus.",
  AI_AUTH_FAILED: "A chave da API de IA não foi aceita. Atualize a configuração da conexão.",
  AI_QUOTA_EXCEEDED: "A conta da API de IA está sem saldo ou atingiu seu limite de uso.",
  AI_RATE_LIMITED: "A IA está recebendo muitas solicitações. Tente novamente em instantes.",
  AI_MODEL_UNAVAILABLE: "O modelo escolhido não está disponível para esta conexão. Revise o modelo do agente.",
  AI_TIMEOUT: "A IA demorou demais para responder. Tente novamente.",
  AI_PROVIDER_FAILED: "Não foi possível obter uma resposta da IA. Tente novamente em instantes.",
  AI_EMPTY_RESPONSE: "A IA não retornou uma resposta de texto. Tente novamente.",
};
export class AIError extends Error {
  constructor(public readonly code: AIErrorCode) { super(messages[code]); }
}
