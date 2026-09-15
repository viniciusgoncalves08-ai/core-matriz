import { z } from "zod";
const description = z.string().trim().max(5000);
const date = z.string().date().nullable();
export const projectSchema = z.object({ name: z.string().trim().min(2).max(120), description: description.optional(), status: z.enum(["IDEA", "PLANNING", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).optional() }).strict();
export const projectPatchSchema = projectSchema.partial().refine(v => Object.keys(v).length > 0);
export const taskSchema = z.object({ title: z.string().trim().min(2).max(200), description: description.optional(), projectId: z.string().min(1).max(100).nullable().optional(), status: z.enum(["INBOX", "TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"]).optional(), priority: z.number().int().min(0).max(3).optional(), dueAt: date.optional() }).strict();
export const taskPatchSchema = taskSchema.partial().refine(v => Object.keys(v).length > 0);
