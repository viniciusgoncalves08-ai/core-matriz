import { OpenAIProvider } from "@/ai/openai-provider";
import { buildContext, serializeContext } from "@/features/context/context-engine";
import { db } from "@/lib/db";

const provider = new OpenAIProvider();

const NEXUS_SYSTEM_PROMPT = `Você é o Nexus, interface central do Core Matriz.
Seja direto, analítico, profissional, crítico e honesto.
Não invente ações executadas. Quando houver incerteza, declare-a.
Use apenas o contexto relevante fornecido e não trate hipóteses como fatos.`;

export async function respondAsNexus(params: {
  userId: string;
  conversationId: string;
  message: string;
}) {
  const startedAt = Date.now();
  const conversation = await db.conversation.findFirst({
    where: { id: params.conversationId, userId: params.userId },
    select: { id: true },
  });

  if (!conversation) throw new Error("Conversa não encontrada ou sem permissão de acesso.");

  const context = await buildContext(params.userId, params.message);

  await db.message.create({
    data: {
      conversationId: params.conversationId,
      role: "user",
      content: params.message,
    },
  });

  try {
    const result = await provider.generate({
      messages: [
        { role: "system", content: NEXUS_SYSTEM_PROMPT },
        { role: "system", content: `Contexto recuperado:\n${serializeContext(context)}` },
        { role: "user", content: params.message },
      ],
    });

    const assistantMessage = await db.message.create({
      data: {
        conversationId: params.conversationId,
        role: "assistant",
        content: result.text,
        metadata: { provider: result.provider, model: result.model },
      },
    });

    await db.conversation.update({
      where: { id: params.conversationId },
      data: { updatedAt: new Date() },
    });

    await db.auditLog.create({
      data: {
        userId: params.userId,
        action: "NEXUS_RESPONSE_GENERATED",
        entityType: "conversation",
        entityId: params.conversationId,
        model: result.model,
        success: true,
        durationMs: Date.now() - startedAt,
      },
    });

    return { message: assistantMessage, context };
  } catch (error) {
    await db.auditLog.create({
      data: {
        userId: params.userId,
        action: "NEXUS_RESPONSE_FAILED",
        entityType: "conversation",
        entityId: params.conversationId,
        success: false,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
    });
    throw error;
  }
}
