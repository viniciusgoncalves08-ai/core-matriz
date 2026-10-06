import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getTaskQuery, respondWithTaskQuery } from "./task-query";
describe.skipIf(process.env.ACTION_DB_TESTS !== "true")("task query with isolated Postgres", () => {
  let userId: string; let conversationId: string;
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/core_matriz") throw new Error("Only isolated local CI database allowed");
    userId = (await db.user.create({data:{email:`query-${crypto.randomUUID()}@example.invalid`}})).id;
    conversationId = (await db.conversation.create({data:{userId,title:"Isolated task query"}})).id;
    await db.task.createMany({data:[{userId,title:"Undated",status:"TODO"},{userId,title:"Overdue",status:"BLOCKED",dueAt:new Date("2026-10-04")},{userId,title:"Closed",status:"COMPLETED"}]});
  });
  afterAll(async () => { if (userId) await db.user.delete({where:{id:userId}}); await db.$disconnect(); });
  it("returns only owned open tasks and persists a grounded response and audit", async () => {
    expect((await getTaskQuery(userId,"open")).total).toBe(2);
    expect((await getTaskQuery(userId,"undated")).tasks.map(t=>t.title)).toEqual(["Undated"]);
    expect((await getTaskQuery(userId,"overdue",new Date("2026-10-05T12:00:00Z"))).tasks.map(t=>t.title)).toEqual(["Overdue"]);
    expect((await getTaskQuery("other","open")).total).toBe(0);
    const result=await respondWithTaskQuery({userId,conversationId,message:"minhas tarefas",filter:"open"});
    expect(result.message.content).toContain("2 tarefa(s)");
    expect(await db.message.count({where:{conversationId}})).toBe(2);
    expect(await db.auditLog.count({where:{userId,action:"TASKS_VIEWED"}})).toBe(1);
  });
});
