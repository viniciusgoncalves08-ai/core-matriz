import { beforeEach, expect, it, vi } from "vitest";
const findMany = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db",()=>({db:{message:{findMany}}}));
import { expandRecallTerms, excerptAroundMatch, recallConversations, RECALL_POLICY } from "./conversation-recall";
beforeEach(()=>{findMany.mockReset();findMany.mockResolvedValue([]);});
it("searches only owner conversations and excludes restricted memory sources",async()=>{
 await recallConversations("u",["leitura"],["current"]);
 expect(findMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({conversation:{userId:"u",memories:{none:{status:{in:["BLOCKED","DELETED","SUPERSEDED"]}}}},id:{notIn:["current"]}}),take:24}));
});
it("returns dated excerpts with provenance and keeps the historical role",async()=>{
 findMany.mockResolvedValue([{id:"m",conversationId:"c",role:"assistant",content:"Plano de leitura",createdAt:new Date("2026-09-01"),conversation:{title:"Livros"}}]);
 const result=await recallConversations("u",["leitura"]);
 expect(result[0]).toMatchObject({id:"m",conversationId:"c",role:"assistant",title:"Livros",content:"Plano de leitura"});
});
it("extracts the matching passage instead of only the start of long messages",()=>{
 const text="x".repeat(4000)+" leitura do livro"+"y".repeat(4000);
 const excerpt=excerptAroundMatch(text,["leitura"]);
 expect(excerpt).toContain("leitura do livro");
 expect(excerpt.length).toBeLessThanOrEqual(1002);
});
it("does not browse all conversations when there is no topic",async()=>{
 expect(await recallConversations("u",[])).toEqual([]);
 expect(findMany).not.toHaveBeenCalled();
});
it("recognizes basic reading vocabulary without claiming semantic search",()=>{
 expect(expandRecallTerms(["livros"])).toEqual(expect.arrayContaining(["livro","leitura"]));
 expect(RECALL_POLICY).toContain("NUNCA conclua que não existem registros");
});
