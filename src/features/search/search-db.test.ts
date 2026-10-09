import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { globalSearch } from "./search-service";
describe.skipIf(process.env.ACTION_DB_TESTS !== "true")("global search with isolated Postgres", () => {
 let owner: string; let other: string;
 beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL!);
  if (!["localhost","127.0.0.1"].includes(url.hostname) || url.pathname !== "/core_matriz") throw new Error("Only isolated CI database allowed");
  owner = (await db.user.create({data:{email:`global-${crypto.randomUUID()}@example.invalid`}})).id;
  other = (await db.user.create({data:{email:`global-${crypto.randomUUID()}@example.invalid`}})).id;
  for(const userId of [owner,other]) {
   await db.task.create({data:{userId,title:"Fornecedor tarefa"}});
   await db.project.create({data:{userId,name:"Projeto",description:"Fornecedor projeto"}});
   await db.goal.create({data:{userId,title:"Meta",description:"Fornecedor objetivo"}});
   await db.conversation.create({data:{userId,title:"Conversa",messages:{create:{role:"user",content:"Fornecedor mensagem"}}}});
   await db.memory.create({data:{userId,content:"Memória",source:"Fornecedor origem",classification:"FACT"}});
  }
  await db.memory.createMany({data:[
   {userId:owner,content:"Fornecedor bloqueado",classification:"FACT",status:"BLOCKED"},
   {userId:owner,content:"Fornecedor excluído",classification:"FACT",status:"DELETED"},
   {userId:owner,content:"Fornecedor substituído",classification:"FACT",status:"SUPERSEDED"},
   {userId:owner,content:"Fornecedor vencido",classification:"FACT",validUntil:new Date("2000-01-01")},
   {userId:owner,content:"Fornecedor futuro",classification:"FACT",validFrom:new Date("2100-01-01")},
  ]});
  await db.conversation.create({data:{userId:owner,title:"Interna",messages:{create:{role:"system",content:"Fornecedor interno"}}}});
 });
 afterAll(async()=>{for(const id of [owner,other]) if(id) await db.user.delete({where:{id}});await db.$disconnect();});
 it("searches all five modules without foreign, invalid memory or internal-message results",async()=>{
  const result=await globalSearch(owner,{q:"FORNECEDOR"});
  expect(result.results).toHaveLength(5);
  expect(new Set(result.results.map(r=>r.kind)).size).toBe(5);
  const foreign=await globalSearch(other,{q:"fornecedor"});
  expect(result.results.some(r=>foreign.results.some(f=>f.id===r.id))).toBe(false);
  expect((await globalSearch("nonexistent",{q:"fornecedor"})).results).toEqual([]);
 });
 it("returns just the selected category and responds to blocking",async()=>{
  const before=await globalSearch(owner,{q:"fornecedor",kind:"memories"});
  expect(before.results).toHaveLength(1);
  await db.memory.update({where:{id:before.results[0].id},data:{status:"BLOCKED"}});
  expect((await globalSearch(owner,{q:"fornecedor",kind:"memories"})).results).toEqual([]);
 });
});
