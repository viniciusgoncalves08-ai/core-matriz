import { z } from "zod";
import { db } from "@/lib/db";
export const linkTarget = z.object({ kind: z.enum(["conversation", "memory"]), id: z.string().min(1).max(100) }).strict();
export const linkChange = linkTarget.extend({ projectId: z.string().min(1).max(100).nullable(), expectedProjectId: z.string().min(1).max(100).nullable() }).strict();
export class ProjectLinkNotFound extends Error {}
export class ProjectLinkConflict extends Error {}
export async function getProjectLink(userId: string, raw: unknown) {
  const { kind, id } = linkTarget.parse(raw);
  const target = kind === "conversation"
    ? await db.conversation.findFirst({ where: { id, userId }, select: { projectId: true } })
    : await db.memory.findFirst({ where: { id, userId, status: { not: "DELETED" } }, select: { projectId: true } });
  if (!target) throw new ProjectLinkNotFound();
  const projects = await db.project.findMany({ where: { userId }, select: { id: true, name: true }, orderBy: [{ name: "asc" }, { id: "asc" }] });
  return { projectId: target.projectId, projects };
}
export async function changeProjectLink(userId: string, raw: unknown) {
  const input = linkChange.parse(raw);
  return db.$transaction(async tx => {
    const target = input.kind === "conversation"
      ? await tx.conversation.findFirst({ where: { id: input.id, userId }, select: { projectId: true } })
      : await tx.memory.findFirst({ where: { id: input.id, userId, status: { not: "DELETED" } }, select: { projectId: true } });
    if (!target) throw new ProjectLinkNotFound();
    if (input.projectId && !await tx.project.findFirst({ where: { id: input.projectId, userId }, select: { id: true } })) throw new ProjectLinkNotFound();
    if (target.projectId !== input.expectedProjectId) throw new ProjectLinkConflict();
    if (target.projectId === input.projectId) return { projectId: input.projectId };
    const where = { id: input.id, userId, projectId: input.expectedProjectId };
    const changed = input.kind === "conversation"
      ? await tx.conversation.updateMany({ where, data: { projectId: input.projectId } })
      : await tx.memory.updateMany({ where: { ...where, status: { not: "DELETED" } }, data: { projectId: input.projectId } });
    if (changed.count !== 1) throw new ProjectLinkConflict();
    await tx.auditLog.create({ data: { userId, action: "PROJECT_LINK_CHANGED", entityType: input.kind, entityId: input.id, permission: "CONFIRM", metadata: { before: input.expectedProjectId, after: input.projectId } } });
    return { projectId: input.projectId };
  });
}
export async function createProjectConversation(userId: string, title: string, projectId: string | null) {
  return db.$transaction(async tx => {
    if (projectId && !await tx.project.findFirst({ where: { id: projectId, userId }, select: { id: true } })) throw new ProjectLinkNotFound();
    const conversation = await tx.conversation.create({ data: { userId, title, projectId } });
    if (projectId) await tx.auditLog.create({ data: { userId, action: "PROJECT_LINK_CHANGED", entityType: "conversation", entityId: conversation.id, permission: "CONFIRM", metadata: { before: null, after: projectId } } });
    return conversation;
  });
}
