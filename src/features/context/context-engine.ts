import { db } from "@/lib/db";

export type NexusContext = {
  memories: Array<{ id: string; summary: string | null; content: string; classification: string }>;
  projects: Array<{ id: string; name: string; description: string | null; status: string }>;
  tasks: Array<{ id: string; title: string; status: string; dueAt: Date | null }>;
};

export async function buildContext(userId: string, message: string): Promise<NexusContext> {
  const terms = message
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((term) => term.length >= 4)
    .slice(0, 8);

  const textFilters = terms.flatMap((term) => [
    { content: { contains: term, mode: "insensitive" as const } },
    { summary: { contains: term, mode: "insensitive" as const } },
  ]);

  const [memories, projects, tasks] = await Promise.all([
    db.memory.findMany({
      where: {
        userId,
        status: "ACTIVE",
        ...(textFilters.length ? { OR: textFilters } : {}),
      },
      orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
      take: 8,
      select: { id: true, summary: true, content: true, classification: true },
    }),
    db.project.findMany({
      where: {
        userId,
        status: { in: ["IDEA", "PLANNING", "ACTIVE", "PAUSED"] },
        ...(terms.length
          ? { OR: terms.flatMap((term) => [{ name: { contains: term, mode: "insensitive" as const } }, { description: { contains: term, mode: "insensitive" as const } }]) }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, name: true, description: true, status: true },
    }),
    db.task.findMany({
      where: { userId, status: { in: ["INBOX", "TODO", "IN_PROGRESS", "BLOCKED"] } },
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
      take: 8,
      select: { id: true, title: true, status: true, dueAt: true },
    }),
  ]);

  return { memories, projects, tasks };
}

export function serializeContext(context: NexusContext): string {
  return JSON.stringify(context, null, 2);
}
