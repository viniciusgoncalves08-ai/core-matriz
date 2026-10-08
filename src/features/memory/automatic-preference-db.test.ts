import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { saveAutomaticPreference } from "./automatic-preference";
describe.skipIf(process.env.ACTION_DB_TESTS !== "true")("automatic memory persistence", () => {
 let userId: string; let conversationId: string;
 beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/core_matriz") throw new Error("Only isolated CI database allowed");
  userId = (await db.user.create({ data: { email: `auto-${crypto.randomUUID()}@example.invalid` } })).id;
  conversationId = (await db.conversation.create({ data: { userId } })).id;
 });
 afterAll(async () => { if(userId) await db.user.delete({ where: { id: userId } }); await db.$disconnect(); });
 it("saves origin and version once, audits, and never recreates a rejected preference", async () => {
  const message = await db.message.create({ data: { conversationId, role: "user", content: "Prefiro respostas curtas" } });
  const input = { userId, conversationId, messageId: message.id, content: message.content };
  const ids = await Promise.all([db.$transaction(tx => saveAutomaticPreference(tx,input)), db.$transaction(tx => saveAutomaticPreference(tx,input))]);
  expect(ids.filter(Boolean)).toHaveLength(1);
  const memory = await db.memory.findFirstOrThrow({ where: { userId }, include: { versions: true } });
  expect(memory.classification).toBe("PREFERENCE"); expect(memory.versions).toHaveLength(1); expect(memory.conversationId).toBe(conversationId);
  expect(memory.metadata).toMatchObject({ sourceMessageId: message.id });
  expect(await db.auditLog.count({ where: { userId, action: "MEMORY_CREATED" } })).toBe(1);
  await db.memory.update({ where: { id: memory.id }, data: { status: "DELETED" } });
  expect(await db.$transaction(tx => saveAutomaticPreference(tx,input))).toBeUndefined();
  expect(await db.memory.count({ where: { userId } })).toBe(1);
 });
 it("refuses a conversation belonging to another owner", async () => {
  await expect(db.$transaction(tx => saveAutomaticPreference(tx,{userId:"other",conversationId,messageId:"missing",content:"Prefiro estudar"}))).rejects.toThrow("Conversa não encontrada");
 });
});
