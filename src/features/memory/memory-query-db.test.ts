import {afterAll,beforeAll,describe,expect,it} from "vitest";
import {db} from "@/lib/db";
import {getMemoryQuery,respondWithMemoryQuery} from "./memory-query";
describe.skipIf(process.env.ACTION_DB_TESTS!=="true")("memory inventory with isolated Postgres",()=>{
 let userId:string;let conversationId:string;
 beforeAll(async()=>{
  const url=new URL(process.env.DATABASE_URL!);if(!["localhost","127.0.0.1"].includes(url.hostname)||url.pathname!=="/core_matriz")throw new Error("Only isolated local CI database allowed");
  userId=(await db.user.create({data:{email:`memory-query-${crypto.randomUUID()}@example.invalid`}})).id;
  conversationId=(await db.conversation.create({data:{userId,title:"Isolated memory inventory"}})).id;
  await db.memory.createMany({data:[
   {userId,classification:"PREFERENCE",content:"Active preference",validFrom:new Date("2020-01-01")},
   {userId,classification:"CONTEXT",content:"Blocked",status:"BLOCKED"},
   {userId,classification:"CONTEXT",content:"Deleted",status:"DELETED"},
   {userId,classification:"CONTEXT",content:"Superseded",status:"SUPERSEDED"},
   {userId,classification:"CONTEXT",content:"Expired",validFrom:new Date("2020-01-01"),validUntil:new Date("2021-01-01")},
   {userId,classification:"CONTEXT",content:"Future",validFrom:new Date("2099-01-01")},
  ]});
 });
 afterAll(async()=>{if(userId)await db.user.delete({where:{id:userId}});await db.$disconnect();});
 it("filters private and unusable records and persists the actual result",async()=>{
  const data=await getMemoryQuery(userId,new Date("2026-10-06T12:00:00Z"));expect(data.total).toBe(1);expect(data.memories[0].content).toBe("Active preference");
  expect((await getMemoryQuery("other")).total).toBe(0);
  const response=await respondWithMemoryQuery({userId,conversationId,message:"liste minhas memórias"});
  expect(response.message.content).toContain("Active preference");expect(response.message.content).not.toContain("Blocked");
  expect(await db.message.count({where:{conversationId}})).toBe(2);
  expect(await db.auditLog.count({where:{userId,action:"MEMORIES_VIEWED"}})).toBe(1);
 });
});
