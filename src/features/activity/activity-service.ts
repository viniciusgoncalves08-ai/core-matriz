import { db } from "@/lib/db";
import { z } from "zod";

export const activityFilter = z.object({
  kind: z.enum(["all", "memory", "project", "task", "agent", "conversation"]).default("all"),
  result: z.enum(["all", "success", "failure"]).default("all"),
  page: z.coerce.number().int().min(1).max(1000).default(1),
});

export async function listActivity(userId: string, input: unknown) {
  const filter = activityFilter.parse(input);
  const rows = await db.auditLog.findMany({
    where: { userId, ...(filter.kind !== "all" ? { entityType: filter.kind } : {}), ...(filter.result !== "all" ? { success: filter.result === "success" } : {}) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 26, skip: (filter.page - 1) * 25,
    // Never expose raw errors, metadata, or secrets to the activity UI.
    select: { id: true, action: true, entityType: true, entityId: true, success: true, createdAt: true, model: true, durationMs: true },
  });
  return { items: rows.slice(0, 25), hasMore: rows.length > 25, page: filter.page };
}

export const activityLabels: Record<string, string> = {
  MEMORY_CREATED: "Memória criada", MEMORY_UPDATED: "Memória corrigida", MEMORY_BLOCKED: "Memória bloqueada", MEMORY_UNBLOCKED: "Memória desbloqueada", MEMORY_DELETED: "Memória excluída",
  PROJECT_CREATED: "Projeto criado", PROJECT_UPDATED: "Projeto atualizado", TASK_CREATED: "Tarefa criada", TASK_UPDATED: "Tarefa atualizada",
  AGENT_CREATED: "Agente criado", AGENT_UPDATED: "Agente atualizado", NEXUS_RESPONSE_GENERATED: "Resposta gerada e salva", NEXUS_RESPONSE_FAILED: "Resposta não concluída",
};
