import { z } from "zod";
import { db } from "@/lib/db";
import { projectSchema, projectPatchSchema, taskSchema, taskPatchSchema } from "./work-schema";
export class WorkNotFoundError extends Error {}
export async function listProjects(userId: string) {
  return db.project.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, include: { tasks: { where: { userId }, select: { status: true } } } });
}
export async function listTasks(userId: string, projectId?: string) {
  if (projectId && !await db.project.findFirst({ where: { id: projectId, userId }, select: { id: true } })) throw new WorkNotFoundError();
  return db.task.findMany({ where: { userId, ...(projectId ? { projectId } : {}) }, orderBy: [{ priority: "desc" }, { dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }], include: { project: { select: { name: true } } } });
}
export async function saveProject(userId: string, raw: unknown, id?: string) {
  const input = id ? projectPatchSchema.parse(raw) : projectSchema.parse(raw);
  return db.$transaction(async tx => {
    if (id && !await tx.project.findFirst({ where: { id, userId }, select: { id: true } })) throw new WorkNotFoundError();
    const project = id ? await tx.project.update({ where: { id, userId }, data: input }) : await tx.project.create({ data: { ...input as z.infer<typeof projectSchema>, userId } });
    await tx.auditLog.create({ data: { userId, action: id ? "PROJECT_UPDATED" : "PROJECT_CREATED", entityType: "project", entityId: project.id, metadata: { fields: Object.keys(input) } } });
    return project;
  });
}
export async function saveTask(userId: string, raw: unknown, id?: string) {
  const input = id ? taskPatchSchema.parse(raw) : taskSchema.parse(raw);
  return db.$transaction(async tx => {
    if (id && !await tx.task.findFirst({ where: { id, userId }, select: { id: true } })) throw new WorkNotFoundError();
    if (input.projectId && !await tx.project.findFirst({ where: { id: input.projectId, userId }, select: { id: true } })) throw new WorkNotFoundError();
    const data = { ...input, ...(input.dueAt !== undefined ? { dueAt: input.dueAt ? new Date(`${input.dueAt}T00:00:00.000Z`) : null } : {}) };
    const task = id ? await tx.task.update({ where: { id, userId }, data }) : await tx.task.create({ data: { ...data, title: input.title!, userId } });
    await tx.auditLog.create({ data: { userId, action: id ? "TASK_UPDATED" : "TASK_CREATED", entityType: "task", entityId: task.id, metadata: { fields: Object.keys(input) } } });
    return task;
  });
}
