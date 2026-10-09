import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { reminderInput, reminderUpdateInput, reminderInstant, requireFutureReminder } from "./reminder-schema";
export class ReminderNotFound extends Error {}
export class ReminderConflict extends Error {}
export const reminderListInput = z.object({ filter: z.enum(["due", "scheduled", "completed", "cancelled"]).default("scheduled"), page: z.coerce.number().int().min(1).max(10000).default(1) }).strict();
export async function listReminders(userId: string, raw: unknown, now = new Date()) {
  const { filter, page } = reminderListInput.parse(raw);
  const dueWhere = { userId, status: "scheduled" as const, dueAt: { lte: now }, readAt: null };
  const where = filter === "due" ? dueWhere : { userId, status: filter };
  const [total, unreadDue, reminders] = await db.$transaction([
    db.reminder.count({ where }), db.reminder.count({ where: dueWhere }),
    db.reminder.findMany({ where, orderBy: [{ dueAt: "asc" }, { id: "asc" }], take: 20, skip: (page - 1) * 20 }),
  ], { isolationLevel: "RepeatableRead" });
  return { reminders, total, unreadDue, page, hasMore: page * 20 < total, checkedAt: now.toISOString() };
}
export async function createReminder(tx: Prisma.TransactionClient, userId: string, raw: unknown, now = new Date(), requestId?: string) {
  const input = reminderInput.parse(raw);
  const dueAt = reminderInstant(input.date, input.time); requireFutureReminder(dueAt, now);
  const reminder = await tx.reminder.create({ data: { userId, title: input.title, dueAt } });
  await tx.auditLog.create({ data: { userId, action: "REMINDER_CREATED", entityType: "reminder", entityId: reminder.id, permission: "CONFIRM", metadata: { dueAt: dueAt.toISOString(), ...(requestId ? { requestId } : {}) } } });
  return reminder;
}
export async function updateReminder(tx: Prisma.TransactionClient, userId: string, id: string, version: number, raw: unknown, now = new Date(), requestId?: string) {
  const input = reminderUpdateInput.parse(raw);
  const current = await tx.reminder.findFirst({ where: { id, userId } });
  if (!current) throw new ReminderNotFound();
  if (current.version !== version) throw new ReminderConflict();
  const dueAt = reminderInstant(input.date, input.time);
  const rescheduled = current.dueAt.getTime() !== dueAt.getTime();
  if (input.status === "scheduled" && (rescheduled || current.status !== "scheduled")) requireFutureReminder(dueAt, now);
  const readAt = rescheduled || current.status !== input.status ? null : current.readAt;
  const changed = await tx.reminder.updateMany({ where: { id, userId, version }, data: { title: input.title, dueAt, status: input.status, readAt, version: { increment: 1 } } });
  if (changed.count !== 1) throw new ReminderConflict();
  await tx.auditLog.create({ data: { userId, action: "REMINDER_UPDATED", entityType: "reminder", entityId: id, permission: "CONFIRM", metadata: { before: { dueAt: current.dueAt.toISOString(), status: current.status }, after: { dueAt: dueAt.toISOString(), status: input.status }, ...(requestId ? { requestId } : {}) } } });
  return tx.reminder.findFirstOrThrow({ where: { id, userId } });
}
export const reminderDecision = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("read"), version: z.number().int().min(0) }).strict(),
  z.object({ operation: z.literal("update"), version: z.number().int().min(0), input: reminderUpdateInput }).strict(),
]);
export async function changeReminder(userId: string, id: string, raw: unknown, now = new Date()) {
  const decision = reminderDecision.parse(raw);
  return db.$transaction(async tx => {
    if (decision.operation === "update") return updateReminder(tx, userId, id, decision.version, decision.input, now);
    const reminder = await tx.reminder.findFirst({ where: { id, userId, status: "scheduled", dueAt: { lte: now } } });
    if (!reminder) throw new ReminderNotFound();
    if (reminder.readAt && reminder.version === decision.version + 1) return reminder;
    if (reminder.version !== decision.version) throw new ReminderConflict();
    if (reminder.readAt) return reminder;
    const changed = await tx.reminder.updateMany({ where: { id, userId, version: decision.version, readAt: null }, data: { readAt: now, version: { increment: 1 } } });
    if (changed.count !== 1) {
      const saved = await tx.reminder.findFirst({ where: { id, userId } });
      if (saved?.readAt && saved.version === decision.version + 1) return saved;
      throw new ReminderConflict();
    }
    await tx.auditLog.create({ data: { userId, action: "REMINDER_READ", entityType: "reminder", entityId: id } });
    return tx.reminder.findFirstOrThrow({ where: { id, userId } });
  });
}
