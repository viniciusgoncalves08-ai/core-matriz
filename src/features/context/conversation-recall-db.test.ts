import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { buildContext, serializeContext } from "./context-engine";
describe.skipIf(process.env.ACTION_DB_TESTS!=="true")("cross-conversation recall with Postgres",()=>{
 let owner:string, other:string, source:string, blocked:string;
 beforeAll(async()=>{
  const url=new URL(process.env.DATABASE_URL!);
  if(!["localhost","127.0.0.1"].includes(url.hostname)||url.pathname!=="/core_matriz")throw new Error("Isolated test database required");
  owner=(await db.user.create({data:{email:crypto.randomUUID()+"@example.invalid"}})).id;
  other=(await db.user.create({data:{email:crypto.randomUUID()+"@example.invalid"}})).id;
  source=(await db.conversation.create({data:{userId:owner,title:"Plano antigo",messages:{create:{role:"user",content:"Meu plano de leitura é terminar dois livros em outubro."}}}})).id;
  await db.conversation.create({data:{userId:other,messages:{create:{role:"user",content:"leitura segredo de outra conta"}}}});
  blocked=(await db.conversation.create({data:{userId:owner,messages:{create:{role:"user",content:"leitura bloqueada"}}}})).id;
  await db.memory.create({data:{userId:owner,conversationId:blocked,content:"leitura bloqueada",classification:"PREFERENCE",status:"BLOCKED"}});
 });
 afterAll(async()=>{for(const id of [owner,other])if(id)await db.user.delete({where:{id}});await db.$disconnect();});
 it("recalls a prior chat despite having no active structured memory",async()=>{
  const context=await buildContext(owner,"Você lembra do meu plano de leitura?");
  expect(context.memories).toEqual([]);
  expect(context.conversations?.some(item=>item.conversationId===source)).toBe(true);
  expect(context.conversations?.some(item=>item.conversationId===blocked)).toBe(false);
  expect(JSON.stringify(context)).not.toContain("segredo de outra conta");
  expect(serializeContext(context).length).toBeLessThanOrEqual(12000);
 });
});
