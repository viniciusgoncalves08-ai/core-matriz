import { db } from "@/lib/db";
import { overviewDay } from "./overview-service";

export function isDailyBriefRequest(message: string) {
  return /^(?:(?:bom dia|boa tarde|boa noite)(?:[,! ]+(?:nexus))?|(?:nexus[, ]+)?(?:resumo do dia|meu resumo do dia|como está meu dia|o que tenho para hoje))\s*[!.?]*$/iu.test(message.trim());
}
export async function getDailyBrief(userId: string, now = new Date()) {
  const today = overviewDay(now);
  const tomorrow = new Date(today.getTime() + 86400000);
  const weekEnd = new Date(today.getTime() + 7 * 86400000);
  const open = { userId, status: { in: ["INBOX", "TODO", "IN_PROGRESS", "BLOCKED"] as ("INBOX" | "TODO" | "IN_PROGRESS" | "BLOCKED")[] } };
  const [overdue, dueToday, tasks, projects, goals] = await Promise.all([
    db.task.count({ where: { ...open, dueAt: { lt: today } } }),
    db.task.count({ where: { ...open, dueAt: { gte: today, lt: tomorrow } } }),
    db.task.findMany({ where: { ...open, dueAt: { lt: tomorrow } }, take: 6, orderBy: [{ dueAt: "asc" }, { priority: "desc" }, { id: "asc" }], select: { id: true, title: true, dueAt: true, priority: true, status: true } }),
    db.project.findMany({ where: { userId, status: "ACTIVE" }, take: 4, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], select: { id: true, name: true } }),
    db.goal.findMany({ where: { userId, status: "active", dueAt: { lt: weekEnd } }, take: 4, orderBy: [{ dueAt: "asc" }, { id: "asc" }], select: { id: true, title: true, dueAt: true, progress: true } }),
  ]);
  return { date: today.toISOString().slice(0, 10), generatedAt: now.toISOString(), overdue, dueToday, tasks, projects, goals };
}
export type DailyBrief = Awaited<ReturnType<typeof getDailyBrief>>;
const plain = (s: string) => s.replace(/[\r\n]+/g, " ").replace(/[\\`*_{}\[\]()<>#!|~]/g, "\\$&");
const dateLabel = (date: Date | null) => date ? date.toISOString().slice(0, 10).split("-").reverse().join("/") : "sem prazo";
export function formatDailyBrief(data: DailyBrief) {
  const lines = [`## Seu resumo de ${data.date.split("-").reverse().join("/")}`, "Prazos no horário de Brasília. Dados consultados agora no Core Matriz.", `**Tarefas:** ${data.overdue} atrasada(s) e ${data.dueToday} com prazo hoje.`, ""];
  if (data.tasks.length) lines.push("### Prazos que pedem atenção", ...data.tasks.map(t => `- ${plain(t.title)} — ${dateLabel(t.dueAt)}${t.status === "BLOCKED" ? " · bloqueada" : ""}`), "[Abrir tarefas](/tarefas) · Até 6 itens, começando pelos mais antigos.");
  else lines.push("Nenhuma tarefa em aberto com prazo até hoje. Tarefas sem prazo ou com prazo futuro não entram nesta lista.");
  lines.push("", "### Projetos ativos");
  lines.push(...(data.projects.length ? data.projects.map(p => `- [${plain(p.name)}](/projetos/${encodeURIComponent(p.id)})`) : ["Nenhum projeto ativo cadastrado."]));
  lines.push("Até 4 projetos, atualizados recentemente.", "", "### Objetivos com prazo próximo ou vencido");
  lines.push(...(data.goals.length ? data.goals.map(g => `- ${plain(g.title)} — ${g.progress}% · ${dateLabel(g.dueAt)}`) : ["Nenhum objetivo ativo com prazo vencido ou nos próximos 7 dias."]));
  lines.push("[Abrir objetivos](/objetivos) · Até 4 itens. Progresso informado por você.", "", "Este resumo é uma consulta do momento; não ativa lembretes ou notificações.");
  return lines.join("\n\n");
}
export async function respondWithDailyBrief(params: { userId: string; conversationId: string; message: string; agentId?: string }) {
  // Verify ownership before retrieving any personal records.
  if (!await db.conversation.findFirst({ where: { id: params.conversationId, userId: params.userId }, select: { id: true } })) throw new Error("Conversa não encontrada");
  const brief = await getDailyBrief(params.userId);
  return db.$transaction(async tx => {
    await tx.message.create({ data: { conversationId: params.conversationId, role: "user", content: params.message } });
    const message = await tx.message.create({ data: { conversationId: params.conversationId, role: "assistant", content: formatDailyBrief(brief), metadata: { kind: "daily_brief", generatedAt: brief.generatedAt, ...(params.agentId ? { agentId: params.agentId } : {}) } } });
    await tx.conversation.update({ where: { id: params.conversationId }, data: { updatedAt: new Date() } });
    await tx.auditLog.create({ data: { userId: params.userId, agentId: params.agentId, action: "DAILY_BRIEF_VIEWED", entityType: "conversation", entityId: params.conversationId } });
    return { message, context: { memories: [], projects: [], tasks: [], goals: [] } };
  });
}
