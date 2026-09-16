import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { actionRecord, actionDecision, taskActionInput, type TaskAction, type ActionView } from "./action-schema";

export class ActionNotFoundError extends Error {}
export class ActionConflictError extends Error {}
const emptyContext = { memories: [], projects: [], tasks: [] };
function decode(metadata: unknown): TaskAction | null {
  const result = actionRecord.safeParse((metadata as { action?: unknown } | null)?.action);
  return result.success ? result.data : null;
}
function view(id: string, action: TaskAction): ActionView {
  return { id, ...action, status: action.status === "pending" && Date.parse(action.expiresAt) <= Date.now() ? "expired" : action.status };
}

export async function proposeTask(params: { userId: string; conversationId: string; message: string; title: string; agentId?: string; agentName?: string }) {
  const action: TaskAction = { version: 1, tool: "task.create", permission: "CONFIRM", status: "pending", expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), input: taskActionInput.parse({ title: params.title }) };
  return db.$transaction(async tx => {
    if (!await tx.conversation.findFirst({ where: { id: params.conversationId, userId: params.userId }, select: { id: true } })) throw new ActionNotFoundError();
    await tx.message.create({ data: { conversationId: params.conversationId, role: "user", content: params.message } });
    const message = await tx.message.create({ data: {
      conversationId: params.conversationId, role: "assistant",
      content: "Preparei uma proposta de tarefa. Revise o cartão de ação e confirme para criá-la. Nenhuma tarefa foi criada ainda. Datas mencionadas no título não definem o prazo automaticamente.",
      metadata: { action, ...(params.agentId ? { agentId: params.agentId, agentName: params.agentName ?? "Nexus" } : {}) },
    } });
    await tx.conversation.update({ where: { id: params.conversationId }, data: { updatedAt: new Date() } });
    await tx.auditLog.create({ data: { userId: params.userId, agentId: params.agentId, action: "ACTION_PROPOSED", entityType: "conversation", entityId: params.conversationId, tool: action.tool, permission: "CONFIRM", metadata: { requestId: message.id } } });
    return { message, context: emptyContext };
  });
}

export async function listActions(userId: string, conversationId: string) {
  if (!await db.conversation.findFirst({ where: { id: conversationId, userId }, select: { id: true } })) throw new ActionNotFoundError();
  const rows = await db.message.findMany({ where: { conversationId, role: "assistant", metadata: { path: ["action", "tool"], equals: "task.create" } }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, metadata: true } });
  return rows.flatMap(row => { const action = decode(row.metadata); return action ? [view(row.id, action)] : []; });
}

export async function decideAction(userId: string, id: string, raw: unknown) {
  const decision = actionDecision.parse(raw);
  return db.$transaction(async tx => {
    const current = await tx.message.findFirst({ where: { id, role: "assistant", conversation: { userId } }, select: { id: true, conversationId: true, metadata: true } });
    const action = decode(current?.metadata);
    if (!current || !action) throw new ActionNotFoundError();
    if (action.status !== "pending") return view(id, action);
    const expired = Date.parse(action.expiresAt) <= Date.now();
    const status = expired ? "expired" : decision.decision === "cancel" ? "cancelled" : "executing";
    const metadata = current.metadata as Prisma.InputJsonObject;
    const claimed = await tx.message.updateMany({
      where: { id, conversation: { userId }, metadata: { path: ["action", "status"], equals: "pending" } },
      data: { metadata: { ...metadata, action: { ...action, status } } },
    });
    // Concurrent confirm/cancel requests cannot both claim the same proposal.
    if (claimed.count !== 1) {
      const latest = await tx.message.findFirst({ where: { id, conversation: { userId } }, select: { metadata: true } });
      const saved = decode(latest?.metadata);
      if (!saved) throw new ActionConflictError();
      return view(id, saved);
    }
    let final: TaskAction = { ...action, status };
    if (status === "executing" && decision.decision === "confirm") {
      const input = decision.input;
      const task = await tx.task.create({ data: { userId, title: input.title, dueAt: input.dueAt ? new Date(`${input.dueAt}T00:00:00.000Z`) : null, priority: input.priority, status: "TODO", metadata: { origin: "nexus", conversationId: current.conversationId, actionRequestId: id } } });
      final = { ...action, input, status: "succeeded", taskId: task.id };
      await tx.auditLog.create({ data: { userId, action: "TASK_CREATED", entityType: "task", entityId: task.id, tool: action.tool, permission: "CONFIRM", metadata: { requestId: id, authorizedBy: userId } } });
    }
    await tx.message.update({ where: { id }, data: {
      metadata: { ...metadata, action: final },
      content: final.status === "succeeded" ? `Tarefa criada após sua confirmação: ${final.input.title}. Consulte-a em Tarefas.` : final.status === "cancelled" ? "Proposta cancelada. Nenhuma tarefa foi criada." : "A proposta expirou. Envie um novo pedido para criar a tarefa.",
    } });
    await tx.conversation.update({ where: { id: current.conversationId }, data: { updatedAt: new Date() } });
    await tx.auditLog.create({ data: { userId, action: final.status === "succeeded" ? "ACTION_CONFIRMED" : final.status === "cancelled" ? "ACTION_CANCELLED" : "ACTION_EXPIRED", entityType: "conversation", entityId: current.conversationId, tool: action.tool, permission: "CONFIRM", metadata: { requestId: id } } });
    return view(id, final);
  });
}
