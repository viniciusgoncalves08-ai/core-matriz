import { z } from "zod";
export const taskActionInput = z.object({ title: z.string().trim().min(2).max(200), dueAt: z.string().date().nullable().default(null), priority: z.number().int().min(0).max(3).default(0) }).strict();
export const taskActionRecord = z.object({
  version: z.literal(1), tool: z.literal("task.create"), permission: z.literal("CONFIRM"),
  status: z.enum(["pending", "executing", "succeeded", "cancelled", "expired"]),
  expiresAt: z.string().datetime(), input: taskActionInput, taskId: z.string().optional(),
});
export const taskUpdateInput = taskActionInput.extend({
  status: z.enum(["INBOX", "TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"]),
});
export const taskUpdateRecord = taskActionRecord.extend({
  tool: z.literal("task.update"), input: taskUpdateInput,
  taskId: z.string().min(1), expectedUpdatedAt: z.string().datetime(),
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
export const memoryActionInput = z.object({
  content: z.string().trim().min(2).max(12000),
  classification: z.enum(["FACT", "PREFERENCE", "DECISION", "HYPOTHESIS", "OBSERVED_PATTERN", "CONTEXT", "KNOWLEDGE", "RESTRICTION", "GOAL"]).default("CONTEXT"),
}).strict();
export const memoryActionRecord = taskActionRecord.omit({ tool: true, input: true, taskId: true }).extend({
  tool: z.literal("memory.create"), input: memoryActionInput, memoryId: z.string().optional(),
});
export const actionRecord = z.discriminatedUnion("tool", [taskActionRecord, taskUpdateRecord, projectActionRecord, projectUpdateRecord, memoryActionRecord]);
export type TaskAction = z.infer<typeof taskActionRecord>;
export type ConfirmedAction = z.infer<typeof actionRecord>;
export type ActionView = ConfirmedAction & { id: string };
export const actionDecision = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("confirm"), input: z.union([taskUpdateInput, taskActionInput, projectActionInput, projectUpdateInput, memoryActionInput]) }).strict(),
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

// A direct user request proposes a memory; only the confirmation endpoint writes it.
export function parseMemoryCommand(message: string): string | null {
  const text = message.trim();
  const legacy = text.match(/^(?:\/memoria\s+|(?:salve|guarde|registre)\s+(?:na\s+mem[oó]ria|(?:uma\s+)?mem[oó]ria)\s*:\s*|(?:lembre|lembre-se)\s+(?:de\s+)?que\s+)([\s\S]+)$/iu);
  const natural = text.match(/^(?:nexus[, ]+)?(?:por favor[, ]+)?(?:(?:quero que (?:voc[eê] )?)|(?:voc[eê] pode |pode ))?(?:guardar|salvar|registrar|lembrar|guarde|salve|registre|lembre|lembre-se)(?: na mem[oó]ria)?(?: de)?\s+que\s+([\s\S]+)$/iu);
  const content = (legacy?.[1] ?? natural?.[1])?.trim();
  // A concrete body is required; references such as "guarde isso" stay in chat.
  return content && content.length >= 2 && content.length <= 12000 ? content : null;

}

export function parseTaskEditCommand(message: string): string | null {
  const match = message.trim().match(/^(?:\/editar-tarefa\s+|(?:edite|editar|atualize|atualizar)\s+(?:a\s+)?tarefa\s*:\s*)([^\n]+)$/iu);
  const query = match?.[1]?.trim();
  return query && query.length >= 2 && query.length <= 200 ? query : null;
}

// Suggestions only: the user can change this classification before confirming.
// Uncertain claims must never become facts through these rules.
export function suggestMemoryClassification(content: string): z.infer<typeof memoryActionInput>["classification"] {
  const text = content.trim();
  if (/\b(?:talvez|acho que|acredito que|suponho que|pode ser|provavelmente)\b/iu.test(text)) return "HYPOTHESIS";
  if (/^(?:eu\s+)?(?:prefiro|gosto de|n[aã]o gosto de|minha prefer[eê]ncia [eé])\s/iu.test(text)) return "PREFERENCE";
  if (/^(?:eu\s+)?(?:decidi|decidimos|minha decis[aã]o [eé])\s/iu.test(text)) return "DECISION";
  if (/^(?:meu objetivo [eé]|minha meta [eé])\s/iu.test(text)) return "GOAL";
  return "CONTEXT";
}
