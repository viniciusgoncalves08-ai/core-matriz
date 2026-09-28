import { z } from "zod";
export const taskActionInput = z.object({ title: z.string().trim().min(2).max(200), dueAt: z.string().date().nullable().default(null), priority: z.number().int().min(0).max(3).default(0) }).strict();
export const taskActionRecord = z.object({
  version: z.literal(1), tool: z.literal("task.create"), permission: z.literal("CONFIRM"),
  status: z.enum(["pending", "executing", "succeeded", "cancelled", "expired"]),
  expiresAt: z.string().datetime(), input: taskActionInput, taskId: z.string().optional(),
});
export const projectActionInput = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(5000).default(""),
  status: z.enum(["IDEA", "PLANNING", "ACTIVE"]).default("IDEA"),
}).strict();
export const projectActionRecord = taskActionRecord.omit({ tool: true, input: true, taskId: true }).extend({
  tool: z.literal("project.create"), input: projectActionInput, projectId: z.string().optional(),
});
export const projectUpdateInput = projectActionInput.extend({
  status: z.enum(["IDEA", "PLANNING", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]),
});
export const projectUpdateRecord = projectActionRecord.extend({
  tool: z.literal("project.update"), input: projectUpdateInput,
  projectId: z.string().min(1), expectedUpdatedAt: z.string().datetime(),
});
export const actionRecord = z.discriminatedUnion("tool", [taskActionRecord, projectActionRecord, projectUpdateRecord]);
export type TaskAction = z.infer<typeof taskActionRecord>;
export type ConfirmedAction = z.infer<typeof actionRecord>;
export type ActionView = ConfirmedAction & { id: string };
export const actionDecision = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("confirm"), input: z.union([taskActionInput, projectActionInput, projectUpdateInput]) }).strict(),
  z.object({ decision: z.literal("cancel") }).strict(),
]);

// Explicit commands only. Never interpret quoted instructions or model output as authorization.
export function parseTaskCommand(message: string): string | null {
  const match = message.trim().match(/^(?:\/tarefa\s+|(?:crie|criar|adicione|adicionar)\s+(?:uma\s+)?tarefa\s*:\s*)([^\n]+)$/iu);
  const title = match?.[1]?.trim();
  return title && title.length >= 2 && title.length <= 200 ? title : null;
}

export function parseProjectCommand(message: string): string | null {
  const match = message.trim().match(/^(?:\/projeto\s+|(?:crie|criar|registre|registrar|adicione|adicionar)\s+(?:um\s+)?projeto\s*:\s*)([^\n]+)$/iu);
  const name = match?.[1]?.trim();
  return name && name.length >= 2 && name.length <= 120 ? name : null;
}

export function parseProjectEditCommand(message: string): string | null {
  const match = message.trim().match(/^(?:\/editar-projeto\s+|(?:edite|editar|atualize|atualizar)\s+(?:o\s+)?projeto\s*:\s*)([^\n]+)$/iu);
  const query = match?.[1]?.trim();
  return query && query.length >= 2 && query.length <= 120 ? query : null;
}
