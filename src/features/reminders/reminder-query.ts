import { db } from "@/lib/db";
import { listReminders } from "./reminder-service";
import { reminderLabels } from "./reminder-schema";
export function parseReminderQuery(message: string): "scheduled" | "due" | "completed" | "cancelled" | null {
  const text = message.trim().toLowerCase().replace(/[?.!]+$/, "").trim();
  if (/^(?:meus lembretes|\/lembretes|(?:liste|mostre|mostrar) (?:meus |os )?lembretes|lembretes agendados)$/u.test(text)) return "scheduled";
  if (/^(?:(?:liste|mostre) (?:meus |os )?)?lembretes (?:vencidos|atrasados)$/u.test(text)) return "due";
  if (/^(?:(?:liste|mostre) (?:meus |os )?)?lembretes conclu[ií]dos$/u.test(text)) return "completed";
  if (/^(?:(?:liste|mostre) (?:meus |os )?)?lembretes cancelados$/u.test(text)) return "cancelled";
  return null;
}
const escape = (text: string) => text.replace(/[\r\n]+/g, " ").replace(/[\\`*_{}\[\]()<>#!|~]/g, "\\$&");
export async function respondWithReminderQuery(params: { userId: string; conversationId: string; message: string; filter: "scheduled" | "due" | "completed" | "cancelled"; agentId?: string }) {
  if (!await db.conversation.findFirst({ where: { id: params.conversationId, userId: params.userId }, select: { id: true } })) throw new Error("Conversa indisponível");
  const result = await listReminders(params.userId, { filter: params.filter });
  const content = [`## Lembretes da sua conta`, `Consulta realizada agora: **${result.total} lembrete(s)** no filtro ${params.filter === "due" ? "vencidos não lidos" : reminderLabels[params.filter].toLowerCase()}. Horário de Brasília.`,
    ...result.reminders.map(row => `- ${escape(row.title)} — ${row.dueAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · ${reminderLabels[row.status]}${row.readAt ? " · lido" : ""}`),
    `Exibindo ${result.reminders.length} de ${result.total}. [Gerenciar lembretes](/alertas#lembretes). Avisos internos; não enviam notificações com o app fechado.`,
  ].join("\n\n");
  return db.$transaction(async tx => {
    await tx.message.create({ data: { conversationId: params.conversationId, role: "user", content: params.message } });
    const message = await tx.message.create({ data: { conversationId: params.conversationId, role: "assistant", content, metadata: { kind: "reminder_query", generatedAt: result.checkedAt, ...(params.agentId ? { agentId: params.agentId } : {}) } } });
    await tx.conversation.update({ where: { id: params.conversationId }, data: { updatedAt: new Date() } });
    return { message, context: { memories: [], projects: [], tasks: [], goals: [] } };
  });
}
