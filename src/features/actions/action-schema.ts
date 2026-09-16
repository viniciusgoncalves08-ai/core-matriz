import { z } from "zod";
export const taskActionInput = z.object({ title: z.string().trim().min(2).max(200), dueAt: z.string().date().nullable().default(null), priority: z.number().int().min(0).max(3).default(0) }).strict();
export const actionRecord = z.object({
  version: z.literal(1), tool: z.literal("task.create"), permission: z.literal("CONFIRM"),
  status: z.enum(["pending", "executing", "succeeded", "cancelled", "expired"]),
  expiresAt: z.string().datetime(), input: taskActionInput, taskId: z.string().optional(),
});
export type TaskAction = z.infer<typeof actionRecord>;
export type ActionView = TaskAction & { id: string };
export const actionDecision = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("confirm"), input: taskActionInput }).strict(),
  z.object({ decision: z.literal("cancel") }).strict(),
]);

// Explicit commands only. Never interpret quoted instructions or model output as authorization.
export function parseTaskCommand(message: string): string | null {
  const match = message.trim().match(/^(?:\/tarefa\s+|(?:crie|criar|adicione|adicionar)\s+(?:uma\s+)?tarefa\s*:\s*)([^\n]+)$/iu);
  const title = match?.[1]?.trim();
  return title && title.length >= 2 && title.length <= 200 ? title : null;
}
