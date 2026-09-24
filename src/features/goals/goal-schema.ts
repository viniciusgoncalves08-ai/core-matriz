import { z } from "zod";
export const goalStatuses = { active: "Em andamento", paused: "Pausado", completed: "Concluído", cancelled: "Cancelado" } as const;
export const goalSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional(),
  category: z.string().trim().max(80).optional(),
  status: z.enum(["active", "paused", "completed", "cancelled"]).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  dueAt: z.string().date().nullable().optional(),
  projectId: z.string().min(1).max(100).nullable().optional(),
}).strict();
export const goalPatchSchema = goalSchema.partial().refine(input => Object.keys(input).length > 0);
