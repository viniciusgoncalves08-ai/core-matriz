import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
export async function getMemoryQuery(userId: string, now = new Date()) {
  const where: Prisma.MemoryWhereInput = { userId, status: "ACTIVE", validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gt: now } }] };
  const [total, memories] = await db.$transaction([
    db.memory.count({ where }),
    db.memory.findMany({ where, take: 20, orderBy: [{ importance: "desc" }, { updatedAt: "desc" }, { id: "asc" }], select: { content: true, classification: true } }),
  ], { isolationLevel: "RepeatableRead" });
  return { total, memories, generatedAt: now.toISOString() };
}
const labels: Record<string, string> = { FACT: "Fato registrado", PREFERENCE: "Preferência", DECISION: "Decisão", HYPOTHESIS: "Hipótese", OBSERVED_PATTERN: "Padrão observado", CONTEXT: "Contexto", KNOWLEDGE: "Conhecimento", RESTRICTION: "Restrição", GOAL: "Objetivo" };
const escape = (text: string) => text.replace(/[\r\n]+/g, " ").replace(/[\\`*_{}\[\]()<>#!|~]/g, "\\$&");
export function formatMemoryQuery(data: Awaited<ReturnType<typeof getMemoryQuery>>) {
  const lines = ["## O que está salvo sobre você", `Consultei agora suas memórias ativas e válidas: **${data.total} registro(s)**.`];
  if (!data.total) lines.push("Não há memórias ativas e válidas nesta consulta. Isso não significa que seu histórico de conversas esteja vazio ou que informações tenham sido perdidas.");
  else {
    lines.push(...data.memories.map(memory => `- **${labels[memory.classification] ?? "Memória"}:** ${escape(memory.content.slice(0, 500))}${memory.content.length > 500 ? "… (trecho)" : ""}`));
    lines.push(`Exibindo ${data.memories.length} de ${data.total}, por importância e atualização. Textos longos aparecem em trechos de até 500 caracteres.`);
    lines.push("As classificações são as registradas por você. Hipóteses e padrões observados não são fatos confirmados.");
  }
  lines.push("[Abrir Memória para consultar, corrigir ou bloquear registros](/memoria)", "Para guardar uma informação, envie **guarde que…** e confirme o cartão. Conversas e memórias são registros diferentes.");
  return lines.join("\n\n");
}
export async function respondWithMemoryQuery(params: { userId: string; conversationId: string; message: string; agentId?: string }) {
  if (!await db.conversation.findFirst({ where: { id: params.conversationId, userId: params.userId }, select: { id: true } })) throw new Error("Conversa não encontrada");
  const data = await getMemoryQuery(params.userId);
  return db.$transaction(async tx => {
    await tx.message.create({ data: { conversationId: params.conversationId, role: "user", content: params.message } });
    const message = await tx.message.create({ data: { conversationId: params.conversationId, role: "assistant", content: formatMemoryQuery(data), metadata: { kind: "memory_query", generatedAt: data.generatedAt, ...(params.agentId ? { agentId: params.agentId } : {}) } } });
    await tx.conversation.update({ where: { id: params.conversationId }, data: { updatedAt: new Date() } });
    await tx.auditLog.create({ data: { userId: params.userId, agentId: params.agentId, action: "MEMORIES_VIEWED", entityType: "conversation", entityId: params.conversationId } });
    return { message, context: { memories: [], projects: [], tasks: [], goals: [] } };
  });
}
