import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { proposeReminder, proposeReminderEdit, decideAction, listActions, ActionNotFoundError } from "@/features/actions/action-service";
import { changeReminder, listReminders, ReminderConflict, ReminderNotFound } from "./reminder-service";
import { ReminderTimeError } from "./reminder-schema";
import { respondWithReminderQuery } from "./reminder-query";
describe.skipIf(process.env.ACTION_DB_TESTS !== "true")("internal reminders with isolated Postgres", () => {
  let userId: string, other: string, conversationId: string, reminderId: string;
  const input = { title: "Ligar para fornecedor", date: "2035-01-02", time: "09:00" };
  const dueNow = new Date("2035-01-02T12:00:00.000Z");
  const params = () => ({ userId, conversationId, message: "Me lembre de ligar" });
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/core_matriz") throw new Error("Only isolated CI database allowed");
    userId = (await db.user.create({ data: { email: `reminder-${crypto.randomUUID()}@example.invalid` } })).id;
    other = (await db.user.create({ data: { email: `reminder-other-${crypto.randomUUID()}@example.invalid` } })).id;
    conversationId = (await db.conversation.create({ data: { userId } })).id;
  });
  afterAll(async () => { for (const id of [userId, other]) if (id) await db.user.delete({ where: { id } }); await db.$disconnect(); });
  it("creates only after consent and exactly once for simultaneous confirmations", async () => {
    const p = await proposeReminder({ ...params(), input });
    expect(await db.reminder.count({ where: { userId } })).toBe(0);
    await expect(decideAction(other, p.message.id, { decision: "confirm", input })).rejects.toBeInstanceOf(ActionNotFoundError);
    const results = await Promise.all([decideAction(userId, p.message.id, { decision: "confirm", input }), decideAction(userId, p.message.id, { decision: "confirm", input })]);
    if (results[0].tool !== "reminder.create" || results[1].tool !== "reminder.create") throw new Error("Wrong tool");
    expect(results[0].reminderId).toBe(results[1].reminderId); reminderId = results[0].reminderId!;
    expect(await db.reminder.count({ where: { userId } })).toBe(1);
    expect((await db.reminder.findUniqueOrThrow({ where: { id: reminderId } })).dueAt.toISOString()).toBe("2035-01-02T12:00:00.000Z");
    expect(await db.auditLog.count({ where: { userId, action: "REMINDER_CREATED" } })).toBe(1);
  });
  it("becomes due at the exact instant and deduplicates read receipts without completing", async () => {
    expect((await listReminders(userId, { filter: "due" }, new Date(dueNow.getTime() - 1))).total).toBe(0);
    expect((await listReminders(userId, { filter: "due" }, dueNow)).total).toBe(1);
    await expect(changeReminder(other, reminderId, { operation: "read", version: 0 }, dueNow)).rejects.toBeInstanceOf(ReminderNotFound);
    await Promise.all([changeReminder(userId, reminderId, { operation: "read", version: 0 }, dueNow), changeReminder(userId, reminderId, { operation: "read", version: 0 }, dueNow)]);
    expect(await db.auditLog.count({ where: { userId, action: "REMINDER_READ" } })).toBe(1);
    expect((await listReminders(userId, { filter: "due" }, dueNow)).total).toBe(0);
    expect((await db.reminder.findUniqueOrThrow({ where: { id: reminderId } })).status).toBe("scheduled");
  });
  it("reschedules with a fresh unread occurrence and rejects stale edits and acknowledgements", async () => {
    const row = await db.reminder.findUniqueOrThrow({ where: { id: reminderId } });
    const next = { ...input, time: "10:00", status: "scheduled" };
    await changeReminder(userId, reminderId, { operation: "update", version: row.version, input: next }, dueNow);
    expect((await listReminders(userId, { filter: "due" }, dueNow)).total).toBe(0);
    expect((await listReminders(userId, { filter: "due" }, new Date("2035-01-02T13:00:00Z"))).total).toBe(1);
    await expect(changeReminder(userId, reminderId, { operation: "update", version: row.version, input: next }, dueNow)).rejects.toBeInstanceOf(ReminderConflict);
    await expect(changeReminder(userId, reminderId, { operation: "read", version: 0 }, new Date("2035-01-02T13:00:00Z"))).rejects.toBeInstanceOf(ReminderConflict);
    const changed = await db.reminder.findUniqueOrThrow({ where: { id: reminderId } });
    expect(changed.readAt).toBeNull();
    await expect(changeReminder(userId, reminderId, { operation: "update", version: changed.version, input: { ...input, status: "scheduled" } }, dueNow)).rejects.toBeInstanceOf(ReminderTimeError);
  });
  it("preserves schedule when cancelling through Nexus and can complete through the panel", async () => {
    const p = await proposeReminderEdit({ ...params(), query: input.title, changes: { status: "cancelled" } });
    const action = (await listActions(userId, conversationId)).find(a => a.id === p.message.id)!;
    expect(action.input).toEqual({ ...input, time: "10:00", status: "cancelled" });
    await decideAction(userId, action.id, { decision: "confirm", input: action.input });
    expect((await listReminders(userId, { filter: "due" }, new Date("2035-02-01"))).total).toBe(0);
    expect((await listReminders(userId, { filter: "cancelled" })).total).toBe(1);
    const row = await db.reminder.findUniqueOrThrow({ where: { id: reminderId } });
    await changeReminder(userId, reminderId, { operation: "update", version: row.version, input: { ...input, time: "10:00", status: "completed" } }, new Date("2035-02-01"));
    expect((await listReminders(userId, { filter: "completed" })).total).toBe(1);
    await expect(proposeReminderEdit({ ...params(), userId: other, query: input.title, changes: { status: "cancelled" } })).rejects.toThrow("Não encontrei");
  });
  it("rejects passed dates at confirmation and respects cancelled and expired proposals", async () => {
    const p = await proposeReminder({ ...params(), input: { ...input, title: "Outro" } });
    await expect(decideAction(userId, p.message.id, { decision: "confirm", input: { ...input, date: "2000-01-01" } })).rejects.toBeInstanceOf(ReminderTimeError);
    expect((await listActions(userId, conversationId)).find(a => a.id === p.message.id)?.status).toBe("pending");
    await decideAction(userId, p.message.id, { decision: "cancel" });
    expect((await decideAction(userId, p.message.id, { decision: "confirm", input })).status).toBe("cancelled");
    const expired = await proposeReminder({ ...params(), input: { ...input, title: "Expirado" } });
    const action = (await listActions(userId, conversationId)).find(a => a.id === expired.message.id)!;
    await db.message.update({ where: { id: action.id }, data: { metadata: { action: { ...action, expiresAt: "2000-01-01T00:00:00.000Z" } } } });
    expect((await decideAction(userId, action.id, { decision: "confirm", input })).status).toBe("expired");
    expect(await db.reminder.count({ where: { userId } })).toBe(1);
  });
  it("isolates and paginates lists, and persists a fresh query snapshot", async () => {
    await db.reminder.createMany({ data: Array.from({ length: 22 }, (_, i) => ({ userId, title: `Revisar ${i}`, dueAt: new Date("2035-01-01") })) });
    await db.reminder.create({ data: { userId: other, title: "Segredo externo", dueAt: new Date("2035-01-01") } });
    const first = await listReminders(userId, { filter: "scheduled" });
    const second = await listReminders(userId, { filter: "scheduled", page: 2 });
    expect(first.total).toBe(22); expect(first.reminders).toHaveLength(20); expect(second.reminders).toHaveLength(2);
    expect(new Set([...first.reminders, ...second.reminders].map(r => r.id)).size).toBe(22);
    expect(first.reminders.every(r => r.userId === userId)).toBe(true);
    const result = await respondWithReminderQuery({ ...params(), filter: "scheduled" });
    expect(result.message.content).toContain("22 lembrete(s)"); expect(result.message.content).not.toContain("Segredo externo");
    expect(result.message.metadata).toMatchObject({ kind: "reminder_query" });
  });
});
