import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { proposeTaskEdit, proposeTask, proposeMemory, proposeProject, proposeProjectEdit, ProjectSelectionError, ActionConflictError, decideAction, listActions, ActionNotFoundError } from "./action-service";

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
    if (results[0].tool !== "task.create" || results[1].tool !== "task.create") throw new Error("Wrong tool");
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
  it("creates a project once after two simultaneous confirmations", async () => {
    const id=(await proposeProject({userId,conversationId,message:"/projeto Loja",name:"Loja"})).message.id;
    expect(await db.project.count({where:{userId}})).toBe(0);
    const decision={decision:"confirm",input:{name:"Loja revisada",description:"Plano inicial",status:"PLANNING"}};
    const [a,b]=await Promise.all([decideAction(userId,id,decision),decideAction(userId,id,decision)]);
    if(a.tool!=="project.create" || b.tool!=="project.create") throw new Error("Wrong tool");
    expect(a.status).toBe("succeeded");
    expect(a.projectId).toBe(b.projectId);
    expect(await db.project.count({where:{userId}})).toBe(1);
    expect(await db.project.findUnique({where:{id:a.projectId}})).toMatchObject({name:"Loja revisada",description:"Plano inicial",status:"PLANNING",userId});
    expect(await db.auditLog.count({where:{userId,action:"PROJECT_CREATED",permission:"CONFIRM"}})).toBe(1);
  });
  it("rejects a mismatched tool payload without consuming the proposal", async () => {
    const id=(await proposeProject({userId,conversationId,message:"/projeto Seguro",name:"Seguro"})).message.id;
    await expect(decideAction(userId,id,confirm)).rejects.toThrow();
    expect((await listActions(userId,conversationId)).find(a=>a.id===id)?.status).toBe("pending");
    await expect(decideAction("other",id,{decision:"confirm",input:{name:"Inválido"}})).rejects.toBeInstanceOf(ActionNotFoundError);
    expect((await decideAction(userId,id,{decision:"cancel"})).status).toBe("cancelled");
    expect((await decideAction(userId,id,{decision:"confirm",input:{name:"Não executar"}})).status).toBe("cancelled");
    expect(await db.project.count({where:{userId}})).toBe(1);
  });

  it("edits an owned project once, then rejects stale proposals", async () => {
    const project=await db.project.create({data:{userId,name:"Edit target",status:"ACTIVE"}});
    const proposal=await proposeProjectEdit({userId,conversationId,message:"/editar-projeto Edit target",query:"Edit target"});
    expect((await db.project.findUniqueOrThrow({where:{id:project.id}})).status).toBe("ACTIVE");
    const decision={decision:"confirm",input:{name:"Edit target",description:"Revisado",status:"PAUSED"}};
    await decideAction(userId,proposal.message.id,decision);
    await decideAction(userId,proposal.message.id,decision);
    expect((await db.project.findUniqueOrThrow({where:{id:project.id}})).status).toBe("PAUSED");
    expect(await db.auditLog.count({where:{entityId:project.id,action:"PROJECT_UPDATED"}})).toBe(1);
    const next=await proposeProjectEdit({userId,conversationId,message:"editar",query:project.id});
    await db.project.update({where:{id:project.id},data:{description:"Alteração mais recente",updatedAt:new Date(Date.now()+1000)}});
    await expect(decideAction(userId,next.message.id,decision)).rejects.toBeInstanceOf(ActionConflictError);
    expect((await db.project.findUniqueOrThrow({where:{id:project.id}})).description).toBe("Alteração mais recente");
    expect((await listActions(userId,conversationId)).find(a=>a.id===next.message.id)?.status).toBe("pending");
  });
  it("does not guess ambiguous names or expose another user's projects", async () => {
    await db.project.createMany({data:[{userId,name:"Duplicado"},{userId,name:"Duplicado"}]});
    await expect(proposeProjectEdit({userId,conversationId,message:"editar",query:"Duplicado"})).rejects.toBeInstanceOf(ProjectSelectionError);
    await expect(proposeProjectEdit({userId:"other",conversationId,message:"editar",query:"Duplicado"})).rejects.toBeInstanceOf(ProjectSelectionError);
  });

  it("saves a reviewed memory once with provenance, initial version and audit", async () => {
    const proposal = await proposeMemory({userId,conversationId,message:"lembre que prefiro ler",content:"prefiro ler"});
    expect(await db.memory.count({where:{userId}})).toBe(0);
    const decision={decision:"confirm",input:{content:"Prefiro ler à noite",classification:"PREFERENCE"}};
    await expect(decideAction("other",proposal.message.id,decision)).rejects.toBeInstanceOf(ActionNotFoundError);
    const [a,b]=await Promise.all([decideAction(userId,proposal.message.id,decision),decideAction(userId,proposal.message.id,decision)]);
    if(a.tool!=="memory.create" || b.tool!=="memory.create") throw new Error("Wrong tool");
    expect(a.memoryId).toBe(b.memoryId);
    expect(await db.memory.count({where:{userId}})).toBe(1);
    const memory=await db.memory.findUniqueOrThrow({where:{id:a.memoryId},include:{versions:true}});
    expect(memory).toMatchObject({userId,conversationId,content:"Prefiro ler à noite",classification:"PREFERENCE",status:"ACTIVE"});
    expect(memory.versions).toHaveLength(1);
    expect(await db.auditLog.count({where:{userId,action:"MEMORY_CREATED",entityId:a.memoryId}})).toBe(1);
  });
  it("does not save cancelled or expired memories or consume mismatched payloads", async () => {
    const params={userId,conversationId,message:"/memoria hipótese",content:"hipótese"};
    const id=(await proposeMemory(params)).message.id;
    await expect(decideAction(userId,id,confirm)).rejects.toThrow();
    expect((await listActions(userId,conversationId)).find(a=>a.id===id)?.status).toBe("pending");
    await decideAction(userId,id,{decision:"cancel"});
    expect((await decideAction(userId,id,{decision:"confirm",input:{content:"Não salvar"}})).status).toBe("cancelled");
    const expired=(await proposeMemory(params)).message.id;
    const action=(await listActions(userId,conversationId)).find(a=>a.id===expired)!;
    await db.message.update({where:{id:expired},data:{metadata:{action:{...action,expiresAt:"2020-01-01T00:00:00.000Z"}}}});
    expect((await decideAction(userId,expired,{decision:"confirm",input:{content:"Não salvar"}})).status).toBe("expired");
    expect(await db.memory.count({where:{userId}})).toBe(1);
  });

  it("updates a task once after consent and prevents stale updates and cross-user edits", async () => {
    const task=await db.task.create({data:{userId,title:"Task update target",status:"TODO"}});
    const params={userId,conversationId,message:"editar tarefa",query:task.id};
    const proposal=await proposeTaskEdit(params);
    expect((await db.task.findUniqueOrThrow({where:{id:task.id}})).status).toBe("TODO");
    const decision={decision:"confirm",input:{title:task.title,dueAt:"2026-12-20",priority:3,status:"COMPLETED"}};
    await expect(decideAction("other",proposal.message.id,decision)).rejects.toBeInstanceOf(ActionNotFoundError);
    const results=await Promise.all([decideAction(userId,proposal.message.id,decision),decideAction(userId,proposal.message.id,decision)]);
    expect(results.every(r=>r.status==="succeeded")).toBe(true);
    expect(await db.task.findUniqueOrThrow({where:{id:task.id}})).toMatchObject({status:"COMPLETED",priority:3,dueAt:new Date("2026-12-20T00:00:00.000Z")});
    expect(await db.auditLog.count({where:{entityId:task.id,action:"TASK_UPDATED"}})).toBe(1);
    const stale=await proposeTaskEdit(params);
    await db.task.update({where:{id:task.id},data:{title:"Newer title",updatedAt:new Date(Date.now()+1000)}});
    await expect(decideAction(userId,stale.message.id,decision)).rejects.toBeInstanceOf(ActionConflictError);
    expect((await listActions(userId,conversationId)).find(a=>a.id===stale.message.id)?.status).toBe("pending");
    await decideAction(userId,stale.message.id,{decision:"cancel"});
    expect((await decideAction(userId,stale.message.id,decision)).status).toBe("cancelled");
    await expect(proposeTaskEdit({...params,userId:"other"})).rejects.toBeInstanceOf(ProjectSelectionError);
    await db.task.createMany({data:[{userId,title:"Duplicate task"},{userId,title:"Duplicate task"}]});
    await expect(proposeTaskEdit({...params,query:"Duplicate task"})).rejects.toBeInstanceOf(ProjectSelectionError);
  });

});
