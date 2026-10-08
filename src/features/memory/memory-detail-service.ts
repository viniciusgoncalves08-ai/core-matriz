import { db } from "@/lib/db";
export async function getMemoryDetail(userId: string, id: string) {
  const memory = await db.memory.findFirst({ where: { id, userId }, select: {
    id: true, content: true, summary: true, classification: true, status: true,
    source: true, conversationId: true, createdAt: true, updatedAt: true,
    validFrom: true, validUntil: true,
    versions: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 10, select: { id: true, content: true, reason: true, createdAt: true } },
  } });
  if (!memory) return null;
  if (memory.status === "DELETED") return { id: memory.id, status: "DELETED" as const };
  return memory;
}
