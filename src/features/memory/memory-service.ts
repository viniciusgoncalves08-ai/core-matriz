import { db } from "@/lib/db";
import type { MemoryClassification } from "@prisma/client";

export async function listMemories(userId: string) {
  return db.memory.findMany({
    where: { userId, status: { not: "DELETED" } },
    orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
    include: { versions: { orderBy: { createdAt: "desc" }, take: 5 } },
  });
}

export async function createMemory(input: {
  userId: string;
  content: string;
  summary?: string;
  classification: MemoryClassification;
  source?: string;
  importance?: number;
  confidence?: number;
}) {
  return db.$transaction(async tx => {
    const memory = await tx.memory.create({
      data: {
        userId: input.userId,
        content: input.content,
        summary: input.summary,
        classification: input.classification,
        source: input.source,
        importance: input.importance ?? 0.5,
        confidence: input.confidence ?? 0.7,
        versions: {
          create: {
            content: input.content,
            summary: input.summary,
            status: "ACTIVE",
            reason: "Versão inicial",
          },
        },
      },
    });
    await tx.auditLog.create({ data: { userId: input.userId, action: "MEMORY_CREATED", entityType: "memory", entityId: memory.id } });
    return memory;
  });
}

export async function updateMemory(input: {
  userId: string;
  memoryId: string;
  content: string;
  summary?: string;
  reason?: string;
}) {
  return db.$transaction(async (tx) => {
    const current = await tx.memory.findFirst({ where: { id: input.memoryId, userId: input.userId, status: { not: "DELETED" } } });
    if (!current) throw new Error("Memória não encontrada");

    await tx.memoryVersion.create({
      data: {
        memoryId: current.id,
        content: current.content,
        summary: current.summary,
        status: current.status,
        reason: input.reason ?? "Substituída por nova versão",
      },
    });

    const updated = await tx.memory.update({
      where: { id: current.id },
      data: {
        content: input.content,
        summary: input.summary,
        status: current.status,
        validFrom: new Date(),
        validUntil: null,
      },
    });
    await tx.auditLog.create({ data: { userId: input.userId, action: "MEMORY_UPDATED", entityType: "memory", entityId: current.id } });
    return updated;
  });
}

export async function setMemoryStatus(userId: string, memoryId: string, status: "ACTIVE" | "BLOCKED" | "DELETED") {
  return db.$transaction(async tx => {
    const memory = await tx.memory.findFirst({ where: { id: memoryId, userId, status: { not: "DELETED" } } });
    if (!memory) throw new Error("Memória não encontrada");
    await tx.memoryVersion.create({ data: {
      memoryId, content: memory.content, summary: memory.summary, status: memory.status,
      reason: status === "BLOCKED" ? "Bloqueada pelo usuário" : status === "ACTIVE" ? "Desbloqueada pelo usuário" : "Exclusão solicitada pelo usuário",
    } });
    const updated = await tx.memory.update({ where: { id: memoryId }, data: { status, validUntil: status === "DELETED" ? new Date() : null } });
    await tx.auditLog.create({ data: { userId, action: status === "DELETED" ? "MEMORY_DELETED" : status === "BLOCKED" ? "MEMORY_BLOCKED" : "MEMORY_UNBLOCKED", entityType: "memory", entityId: memoryId } });
    return updated;
  });
}
