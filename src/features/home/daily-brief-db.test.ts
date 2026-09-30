import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getDailyBrief, respondWithDailyBrief } from "./daily-brief";
describe.skipIf(process.env.ACTION_DB_TESTS !== "true")("daily brief with Postgres",()=>{
 let owner:string,other:string,conversationId:string;
 beforeAll(async()=>{
  const url=new URL(process.env.DATABASE_URL!);
  if(!["localhost","127.0.0.1"].includes(url.hostname)||url.pathname!=="/core_matriz") throw new Error("Only isolated CI database allowed");
  owner=(await db.user.create({data:{email:`brief-${crypto.randomUUID()}@example.invalid`}})).id;
  other=(await db.user.create({data:{email:`brief-${crypto.randomUUID()}@example.invalid`}})).id;
  conversationId=(await db.conversation.create({data:{userId:owner}})).id;
  await db.task.createMany({data:[
   {userId:owner,title:"Past",status:"TODO",dueAt:new Date("2026-09-29")},
   {userId:owner,title:"Today",status:"BLOCKED",dueAt:new Date("2026-09-30")},
   {userId:owner,title:"Future",status:"TODO",dueAt:new Date("2026-10-01")},
   {userId:owner,title:"Done",status:"COMPLETED",dueAt:new Date("2026-09-29")},
   {userId:other,title:"Private",status:"TODO",dueAt:new Date("2026-09-29")},
  ]});
 });
 afterAll(async()=>{for(const id of [owner,other]) if(id) await db.user.delete({where:{id}});await db.$disconnect();});
 it("returns only owned open deadlines and persists a dated brief with audit",async()=>{
  const brief=await getDailyBrief(owner,new Date("2026-10-01T01:00:00Z"));
  expect(brief.overdue).toBe(1);expect(brief.dueToday).toBe(1);
  expect(brief.tasks.map(t=>t.title)).toEqual(["Past","Today"]);
  await expect(respondWithDailyBrief({userId:other,conversationId,message:"bom dia"})).rejects.toThrow();
  const response=await respondWithDailyBrief({userId:owner,conversationId,message:"bom dia"});
  expect(response.message.metadata).toMatchObject({kind:"daily_brief"});
  expect(await db.message.count({where:{conversationId}})).toBe(2);
  expect(await db.auditLog.count({where:{userId:owner,action:"DAILY_BRIEF_VIEWED"}})).toBe(1);
 });
});
