import { db } from "@/lib/db";

export type NexusContext = {
  memories: Array<{ id: string; summary: string | null; content: string; classification: string; source?: string | null; confidence?: number }>;
  projects: Array<{ id: string; name: string; description: string | null; status: string }>;
  goals?: Array<{ id: string; title: string; description: string | null; status: string; progress: number; dueAt: Date | null; projectId: string | null }>;
  tasks: Array<{ id: string; title: string; status: string; dueAt: Date | null }>;
};

const STOP_WORDS = new Set(["para", "sobre", "como", "qual", "quais", "quero", "preciso", "pode", "poderia", "voce", "você", "meus", "minhas", "esse", "essa", "isso", "estou", "tenho", "ajude", "favor", "está", "esta", "olá", "ola"]);

export function extractContextTerms(message: string): string[] {
  return [...new Set(
    message
      .toLowerCase()
      .split(/\s+/)
      .map((term) => term.replace(/[^\p{L}\p{N}]/gu, ""))
      .filter((term) => term.length >= 4 && !STOP_WORDS.has(term)),
  )].slice(0, 8);
}

export async function buildContext(userId: string, message: string): Promise<NexusContext> {
  const terms = extractContextTerms(message);

  if (!terms.length) return { memories: [], projects: [], tasks: [], goals: [] };
  const now = new Date();
  const projectTerms = terms.filter(term => !["projeto", "projetos"].includes(term));
  const goalTerms = terms.filter(term => !["objetivo", "objetivos", "meta", "metas"].includes(term));
  const taskTerms = terms.filter(term => !["tarefa", "tarefas"].includes(term));
  const textFilters = terms.flatMap((term) => [
    { content: { contains: term, mode: "insensitive" as const } },
    { summary: { contains: term, mode: "insensitive" as const } },
  ]);

  const [memories, projects, tasks, goals] = await Promise.all([
    db.memory.findMany({
      where: {
        userId,
        status: "ACTIVE",
        validFrom: { lte: now },
        AND: [{ OR: [{ validUntil: null }, { validUntil: { gt: now } }] }],
        ...(textFilters.length ? { OR: textFilters } : {}),
      },
      orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
      take: 8,
      select: { id: true, summary: true, content: true, classification: true, source: true, confidence: true },
    }),
    db.project.findMany({
      where: {
        userId,
        status: { in: ["IDEA", "PLANNING", "ACTIVE", "PAUSED"] },
        ...(projectTerms.length
          ? { OR: projectTerms.flatMap((term) => [{ name: { contains: term, mode: "insensitive" as const } }, { description: { contains: term, mode: "insensitive" as const } }]) }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, name: true, description: true, status: true },
    }),
    db.task.findMany({
      where: { userId, status: { in: ["INBOX", "TODO", "IN_PROGRESS", "BLOCKED"] }, ...(taskTerms.length ? { OR: taskTerms.map(term => ({ title: { contains: term, mode: "insensitive" as const } })) } : {}) },
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
      take: 8,
      select: { id: true, title: true, status: true, dueAt: true },
    }),
    db.goal.findMany({
      where: { userId, status: { in: ["active", "paused"] }, ...(goalTerms.length ? { OR: goalTerms.flatMap(term => [{ title: { contains: term, mode: "insensitive" as const } }, { description: { contains: term, mode: "insensitive" as const } }, { category: { contains: term, mode: "insensitive" as const } }]) } : {}) },
      orderBy: { updatedAt: "desc" }, take: 5,
      select: { id: true, title: true, description: true, status: true, progress: true, dueAt: true, projectId: true },
    }),
  ]);

  return { memories, projects, tasks, goals };
}

export function serializeContext(context: NexusContext): string {
  // Budget is measured on serialized characters (not an exact token count).
  const bounded: NexusContext = { memories: [], projects: [], tasks: [], goals: [] };
  for (const key of ["memories", "projects", "tasks", "goals"] as const) {
    for (const item of context[key] ?? []) {
      const candidate = Object.fromEntries(Object.entries(item).map(([name, value]) =>
        [name, typeof value === "string" ? value.slice(0, 1200) : value]));
      const trial = { ...bounded, [key]: [...(bounded[key] ?? []), candidate] };
      if (JSON.stringify(trial[key]).length <= 2950 && JSON.stringify(trial).length <= 12000) Object.assign(bounded, trial);
    }
  }
  return JSON.stringify(bounded);
}
