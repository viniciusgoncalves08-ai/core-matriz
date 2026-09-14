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
  return db.memory.create({
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
}

export async function updateMemory(input: {
  userId: string;
  memoryId: string;
  content: string;
  summary?: string;
  reason?: string;
}) {
  return db.$transaction(async (tx) => {
    const current = await tx.memory.findFirst({ where: { id: input.memoryId, userId: input.userId } });
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

    return tx.memory.update({
      where: { id: current.id },
      data: {
        content: input.content,
        summary: input.summary,
        status: "ACTIVE",
        validFrom: new Date(),
        validUntil: null,
      },
    });
  });
}

export async function blockMemory(userId: string, memoryId: string) {
  const memory = await db.memory.findFirst({ where: { id: memoryId, userId } });
  if (!memory) throw new Error("Memória não encontrada");
  return db.memory.update({ where: { id: memoryId }, data: { status: "BLOCKED" } });
}
