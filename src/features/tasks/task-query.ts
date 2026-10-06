import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { overviewDay } from "@/features/home/overview-service";
export type TaskFilter = "open" | "overdue" | "undated";
export function parseTaskQuery(message: string): TaskFilter | null {
  const text = message.trim().toLocaleLowerCase("pt-BR").replace(/[?.!]+$/, "").trim();
  if (/^(?:minhas tarefas|minhas pendências|(?:liste|mostrar|mostre) (?:minhas |as )?tarefas|quais (?:são )?(?:as )?minhas (?:tarefas|pendências))$/u.test(text)) return "open";
  if (/^(?:(?:liste|mostre) (?:minhas |as )?)?(?:minhas )?tarefas atrasadas$/u.test(text)) return "overdue";
  if (/^(?:(?:liste|mostre) (?:minhas |as )?)?(?:minhas )?tarefas sem prazo$/u.test(text)) return "undated";
  return null;
}
export async function getTaskQuery(userId: string, filter: TaskFilter, now = new Date()) {
  const where: Prisma.TaskWhereInput = { userId, status: { in: ["INBOX", "TODO", "IN_PROGRESS", "BLOCKED"] },
    ...(filter === "overdue" ? { dueAt: { lt: overviewDay(now) } } : filter === "undated" ? { dueAt: null } : {}) };
  // A single snapshot keeps the count consistent with the displayed rows.
  const [total, tasks] = await db.$transaction([
    db.task.count({ where }),
    db.task.findMany({ where, take: 20, orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { priority: "desc" }, { id: "asc" }], select: { title: true, dueAt: true, priority: true, status: true } }),
  ], { isolationLevel: "RepeatableRead" });
  return { total, tasks, filter, generatedAt: now.toISOString() };
}
const escape = (text: string) => text.replace(/[\r\n]+/g, " ").replace(/[\\`*_{}\[\]()<>#!|~]/g, "\\$&");
const statusLabels = { INBOX: "Entrada", TODO: "A fazer", IN_PROGRESS: "Em andamento", BLOCKED: "Bloqueada", COMPLETED: "Concluída", CANCELLED: "Cancelada" };
export function formatTaskQuery(data: Awaited<ReturnType<typeof getTaskQuery>>) {
  const heading = { open: "Suas tarefas em aberto", overdue: "Suas tarefas atrasadas", undated: "Suas tarefas sem prazo" }[data.filter];
  const lines = [`## ${heading}`, `Consulta realizada agora: **${data.total} tarefa(s)**. Prazos no horário de Brasília.`];
  if (!data.total) lines.push("Nenhuma tarefa em aberto corresponde a esta consulta.");
  else {
    lines.push(...data.tasks.map(task => `- ${escape(task.title)} — ${statusLabels[task.status]} · ${task.dueAt ? task.dueAt.toISOString().slice(0, 10).split("-").reverse().join("/") : "sem prazo"} · prioridade ${["normal", "média", "alta", "urgente"][task.priority] ?? "não informada"}`));
    lines.push(`Exibindo ${data.tasks.length} de ${data.total}. Primeiro os prazos mais antigos; tarefas sem prazo vêm depois.`);
  }
  lines.push("[Abrir Tarefas](/tarefas)", "Para atualizar ou concluir uma tarefa, envie **edite a tarefa: título completo** e revise o cartão de confirmação.", "Esta consulta não ativa lembretes ou notificações.");
  return lines.join("\n\n");
}
export async function respondWithTaskQuery(params: { userId: string; conversationId: string; message: string; filter: TaskFilter; agentId?: string }) {
  if (!await db.conversation.findFirst({ where: { id: params.conversationId, userId: params.userId }, select: { id: true } })) throw new Error("Conversa não encontrada");
  const data = await getTaskQuery(params.userId, params.filter);
  return db.$transaction(async tx => {
    await tx.message.create({ data: { conversationId: params.conversationId, role: "user", content: params.message } });
    const message = await tx.message.create({ data: { conversationId: params.conversationId, role: "assistant", content: formatTaskQuery(data), metadata: { kind: "task_query", filter: params.filter, generatedAt: data.generatedAt, ...(params.agentId ? { agentId: params.agentId } : {}) } } });
    await tx.conversation.update({ where: { id: params.conversationId }, data: { updatedAt: new Date() } });
    await tx.auditLog.create({ data: { userId: params.userId, agentId: params.agentId, action: "TASKS_VIEWED", entityType: "conversation", entityId: params.conversationId, metadata: { filter: params.filter } } });
    return { message, context: { memories: [], projects: [], tasks: [], goals: [] } };
  });
}
