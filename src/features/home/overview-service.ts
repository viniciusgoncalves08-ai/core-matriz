import { db } from "@/lib/db";
const openTasks = ["INBOX", "TODO", "IN_PROGRESS", "BLOCKED"] as const;
const openProjects = ["IDEA", "PLANNING", "ACTIVE", "PAUSED"] as const;

// Deadlines are stored as date-only values at UTC midnight. Compare them with
// the current calendar day in Brasilia, not with the current UTC clock time.
export function overviewDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (name: string) => parts.find(p => p.type === name)!.value;
  return new Date(`${part("year")}-${part("month")}-${part("day")}T00:00:00.000Z`);
}
export async function getOverview(userId: string, now = new Date()) {
  const today = overviewDay(now);
  const taskWhere = { userId, status: { in: [...openTasks] } };
  const projectWhere = { userId, status: { in: [...openProjects] } };
  const [pending, overdue, projectsCount, memoriesCount, tasks, projects] = await Promise.all([
    db.task.count({ where: taskWhere }),
    db.task.count({ where: { ...taskWhere, dueAt: { lt: today } } }),
    db.project.count({ where: projectWhere }),
    db.memory.count({ where: { userId, status: "ACTIVE" } }),
    db.task.findMany({ where: taskWhere, take: 6, orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { priority: "desc" }, { createdAt: "asc" }], select: { id: true, title: true, status: true, dueAt: true, priority: true, projectId: true } }),
    db.project.findMany({ where: projectWhere, take: 4, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, status: true } }),
  ]);
  return { today, pending, overdue, projectsCount, memoriesCount, tasks, projects };
}
