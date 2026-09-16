import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { proposeTask, decideAction, listActions, ActionNotFoundError } from "./action-service";

describe.skipIf(process.env.ACTION_DB_TESTS !== "true")("task confirmation with real Postgres", () => {
  let userId: string;
  let conversationId: string;
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/core_matriz") throw new Error("Only isolated local CI database allowed");
    const user = await db.user.create({data:{email:`action-test-${crypto.randomUUID()}@example.invalid`}});
    userId=user.id;
    conversationId=(await db.conversation.create({data:{userId,title:"Isolated action test"}})).id;
  });
  afterAll(async () => { if (userId) await db.user.delete({where:{id:userId}}); await db.$disconnect(); });
  async function proposal() {
    return (await proposeTask({userId,conversationId,message:"/tarefa Teste",title:"Teste"})).message.id;
  }
  const confirm={decision:"confirm",input:{title:"Reviewed task",dueAt:"2026-12-20",priority:2}};
  it("does not create before consent and creates once for simultaneous confirmations", async () => {
    const id=await proposal();
    expect(await db.task.count({where:{userId}})).toBe(0);
    const results=await Promise.all([decideAction(userId,id,confirm),decideAction(userId,id,confirm)]);
    expect(results[0].status).toBe("succeeded");
    expect(results[0].taskId).toBe(results[1].taskId);
    expect(await db.task.count({where:{userId}})).toBe(1);
    const task=await db.task.findUniqueOrThrow({where:{id:results[0].taskId}});
    expect(task.title).toBe("Reviewed task");
    expect(task.dueAt?.toISOString()).toBe("2026-12-20T00:00:00.000Z");
    expect(await db.auditLog.count({where:{userId,action:"TASK_CREATED"}})).toBe(1);
  });
  it("denies another user and cancellation cannot later execute", async () => {
    const id=await proposal();
    await expect(decideAction("another-user",id,confirm)).rejects.toBeInstanceOf(ActionNotFoundError);
    await expect(listActions("another-user",conversationId)).rejects.toBeInstanceOf(ActionNotFoundError);
    expect((await decideAction(userId,id,{decision:"cancel"})).status).toBe("cancelled");
    expect((await decideAction(userId,id,confirm)).status).toBe("cancelled");
  });
  it("expired proposals cannot execute", async () => {
    const id=await proposal();
    const action=(await listActions(userId,conversationId)).find(a=>a.id===id)!;
    await db.message.update({where:{id},data:{metadata:{action:{...action,expiresAt:"2020-01-01T00:00:00.000Z"}}}});
    expect((await decideAction(userId,id,confirm)).status).toBe("expired");
    expect(await db.task.count({where:{userId}})).toBe(1);
  });
});
