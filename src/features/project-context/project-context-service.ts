import { db } from "@/lib/db";
import type { NexusContext } from "@/features/context/context-engine";
import { isMemorySnapshot } from "@/features/memory/memory-snapshot";
import { ProjectLinkNotFound } from "./project-link-service";
export async function buildProjectContext(userId: string, projectId: string, conversationId?: string): Promise<NexusContext> {
  const project = await db.project.findFirst({ where: { id: projectId, userId }, select: { id: true, name: true, description: true, status: true } });
  if (!project) throw new ProjectLinkNotFound();
  const now = new Date();
  const owner = { userId, projectId };
  const validMemory = { ...owner, status: "ACTIVE" as const, validFrom: { lte: now }, OR: [{ validUntil: null }, { validUntil: { gt: now } }] };
  const openTask = { ...owner, status: { in: ["INBOX", "TODO", "IN_PROGRESS", "BLOCKED"] as ("INBOX" | "TODO" | "IN_PROGRESS" | "BLOCKED")[] } };
  const [memories, tasks, goals, memoryCount, taskCount, openTasks, goalCount, conversationCount, rows] = await db.$transaction([
    db.memory.findMany({ where: validMemory, take: 8, orderBy: [{ importance: "desc" }, { updatedAt: "desc" }, { id: "asc" }], select: { id: true, content: true, summary: true, classification: true, source: true, confidence: true } }),
    db.task.findMany({ where: openTask, take: 8, orderBy: [{ priority: "desc" }, { dueAt: { sort: "asc", nulls: "last" } }, { id: "asc" }], select: { id: true, title: true, status: true, dueAt: true, projectId: true } }),
    db.goal.findMany({ where: owner, take: 5, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], select: { id: true, title: true, description: true, status: true, progress: true, dueAt: true, projectId: true } }),
    db.memory.count({ where: validMemory }), db.task.count({ where: owner }), db.task.count({ where: openTask }), db.goal.count({ where: owner }), db.conversation.count({ where: owner }),
    db.message.findMany({ where: {
      conversation: { ...owner, ...(conversationId ? { id: { not: conversationId } } : {}), memories: { none: { OR: [{ status: { in: ["BLOCKED", "DELETED", "SUPERSEDED"] } }, { validFrom: { gt: now } }, { validUntil: { lte: now } }] } } },
      role: "user",
    }, take: 24, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { id: true, conversationId: true, content: true, role: true, createdAt: true, metadata: true, conversation: { select: { title: true } } } }),
  ], { isolationLevel: "RepeatableRead" });
  const conversations = rows.filter(row => !isMemorySnapshot(row.metadata)).slice(0, 6).map(row => ({ id: row.id, conversationId: row.conversationId, title: row.conversation.title, content: row.content.slice(0, 900), role: row.role, createdAt: row.createdAt }));
  return { projectScope: { id: project.id, name: project.name, totals: { memories: memoryCount, tasks: taskCount, openTasks, goals: goalCount, conversations: conversationCount } }, projects: [project], memories, tasks, goals, conversations };
}
export async function getProjectHub(userId: string, projectId: string) {
  if (!await db.project.findFirst({ where: { id: projectId, userId }, select: { id: true } })) throw new ProjectLinkNotFound();
  const owner = { userId, projectId };
  const memoryWhere = { ...owner, status: { not: "DELETED" as const } };
  const [conversations, memories, goals, conversationCount, memoryCount, goalCount] = await db.$transaction([
    db.conversation.findMany({ where: owner, take: 20, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], select: { id: true, title: true } }),
    db.memory.findMany({ where: memoryWhere, take: 20, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], select: { id: true, content: true, summary: true, status: true } }),
    db.goal.findMany({ where: owner, take: 20, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], select: { id: true, title: true, progress: true, status: true } }),
    db.conversation.count({ where: owner }), db.memory.count({ where: memoryWhere }), db.goal.count({ where: owner }),
  ], { isolationLevel: "RepeatableRead" });
  return { conversations, memories, goals, conversationCount, memoryCount, goalCount };
}
