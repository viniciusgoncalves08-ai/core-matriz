import { getModelTarget } from "@/ai/model-target";
import { modelRouter } from "@/ai/model-router";
import { buildContext, serializeContext } from "@/features/context/context-engine";
import { db } from "@/lib/db";

export class AgentUnavailableError extends Error {}

const NEXUS_SYSTEM_PROMPT = `Você é o Nexus, interface central do Core Matriz.
Seja direto, analítico, profissional, crítico e honesto.
Não invente ações executadas. Quando houver incerteza, declare-a.
Use apenas o contexto relevante fornecido e não trate hipóteses como fatos.`;

export async function respondAsNexus(params: {
  userId: string;
  conversationId: string;
  message: string;
  agentId?: string;
}) {
  const startedAt = Date.now();
  const conversation = await db.conversation.findFirst({
    where: { id: params.conversationId, userId: params.userId },
    select: { id: true },
  });

  if (!conversation) throw new Error("Conversa não encontrada ou sem permissão de acesso.");

  const agent = await db.agent.findFirst({
    where: params.agentId ? { id: params.agentId, userId: params.userId } : { slug: "nexus", userId: params.userId },
  });
  if (params.agentId && !agent) throw new AgentUnavailableError("Agente não encontrado.");
  if (agent && agent.status !== "ACTIVE") throw new AgentUnavailableError("Este agente está pausado ou desativado. Ative-o em Agentes para conversar.");

  const recentMessages = await db.message.findMany({
    where: { conversationId: conversation.id, role: { in: ["user", "assistant"] } },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { role: true, content: true },
  });
  const history = recentMessages.reverse().map(message => ({
    role: message.role as "user" | "assistant", content: message.content,
  }));

  const context = await buildContext(params.userId, params.message);

  await db.message.create({
    data: {
      conversationId: params.conversationId,
      role: "user",
      content: params.message,
      metadata: agent ? { agentId: agent.id, agentName: agent.name } : undefined,
    },
  });

  try {
    const result = await modelRouter.generate(
      {
        messages: [
          { role: "system", content: agent ? `Você é ${agent.name}. Especialidade: ${agent.role}.\n${agent.systemPrompt}\nNão invente ações executadas. Declare incertezas e use apenas contexto relevante.` : NEXUS_SYSTEM_PROMPT },
          { role: "system", content: `Contexto recuperado:\n${serializeContext(context)}` },
          ...history,
          { role: "user", content: params.message },
        ],
        temperature: agent?.temperature ?? 0.2,
      },
      [getModelTarget(agent?.preferredModel)],
    );

    const assistantMessage = await db.message.create({
      data: {
        conversationId: params.conversationId,
        role: "assistant",
        content: result.text,
        metadata: { provider: result.provider, model: result.model, ...(agent ? { agentId: agent.id, agentName: agent.name } : {}) },
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
        agentId: agent?.id,
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
        agentId: agent?.id,
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
