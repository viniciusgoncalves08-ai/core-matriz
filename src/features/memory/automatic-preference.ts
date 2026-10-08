import type { Prisma } from "@prisma/client";

// Intentionally narrow: one direct preference, never inferred from assistant text.
export function extractAutomaticPreference(message: string): string | null {
  const content = message.trim();
  if (content.length < 12 || content.length > 300 || /[\n\r?"“”`]/.test(content)) return null;
  const normalized = content.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (!/^(?:eu )?prefiro\s+\S/.test(normalized)) return null;
  if (/\b(talvez|acho|se|exemplo|hipoteticamente|senha|chave|token|segredo|cpf|cartao|conta bancaria|sexual|religia|politic|saude|doenca|remedio|diagnostico)/.test(normalized)) return null;
  if (/[\d@]|https?:|www\.|[.!;].*\S/.test(content)) return null;
  return content.replace(/[.!]+$/, "").trim();
}

export function automaticMemoryId(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  const id = (metadata as Record<string, unknown>).automaticMemoryId;
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

export async function saveAutomaticPreference(tx: Prisma.TransactionClient, input: { userId: string; conversationId: string; messageId: string; content: string }) {
  // Serialize per owner to avoid duplicate automatic captures from concurrent chats.
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${input.userId} FOR UPDATE`;
  const conversation = await tx.conversation.findFirst({ where: { id: input.conversationId, userId: input.userId }, select: { id: true } });
  if (!conversation) throw new Error("Conversa não encontrada");
  const existing = await tx.memory.findFirst({ where: { userId: input.userId, content: { equals: input.content, mode: "insensitive" } }, select: { id: true } });
  // Includes blocked/deleted records: do not silently recreate something rejected.
  if (existing) return undefined;
  const memory = await tx.memory.create({ data: {
    userId: input.userId, conversationId: input.conversationId, content: input.content,
    classification: "PREFERENCE", source: "Captura automática de preferência explícita", confidence: 0.8,
    metadata: { capture: "automatic_preference", sourceMessageId: input.messageId },
    versions: { create: { content: input.content, status: "ACTIVE", reason: "Preferência explícita; captura automática ativada pelo usuário" } },
  } });
  await tx.auditLog.create({ data: { userId: input.userId, action: "MEMORY_CREATED", entityType: "memory", entityId: memory.id } });
  return memory.id;
}
