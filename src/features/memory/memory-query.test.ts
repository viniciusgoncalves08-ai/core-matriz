import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ memory: {count:vi.fn(),findMany:vi.fn()}, conversation:{findFirst:vi.fn()}, $transaction:vi.fn() }));
vi.mock("@/lib/db",()=>({db:mocks}));
import {getMemoryQuery,formatMemoryQuery,respondWithMemoryQuery} from "./memory-query";
beforeEach(()=>{vi.clearAllMocks();mocks.memory.count.mockResolvedValue(0);mocks.memory.findMany.mockResolvedValue([]);mocks.$transaction.mockImplementation((queries:Promise<unknown>[])=>Promise.all(queries));});
it("queries only owned active memories within their validity and bounds output",async()=>{
 const now=new Date("2026-10-06T12:00:00Z");await getMemoryQuery("owner",now);
 const query=mocks.memory.findMany.mock.calls[0][0];
 expect(query.where).toEqual({userId:"owner",status:"ACTIVE",validFrom:{lte:now},OR:[{validUntil:null},{validUntil:{gt:now}}]});
 expect(query.take).toBe(20);expect(mocks.memory.count.mock.calls[0][0].where).toEqual(query.where);
});
it("does not equate empty memory with missing conversation history",async()=>{
 const text=formatMemoryQuery(await getMemoryQuery("owner"));
 expect(text).toContain("0 registro(s)");expect(text).toContain("Isso não significa que seu histórico de conversas esteja vazio");
});
it("escapes content, labels hypotheses and discloses truncation",async()=>{
 mocks.memory.count.mockResolvedValue(25);mocks.memory.findMany.mockResolvedValue([{content:"[link](https://example.invalid)"+"x".repeat(1000),classification:"HYPOTHESIS"}]);
 const text=formatMemoryQuery(await getMemoryQuery("owner"));
 expect(text).toContain("\\[link\\]");expect(text).toContain("Hipótese");expect(text).toContain("(trecho)");expect(text).toContain("Exibindo 1 de 25");expect(text.length).toBeLessThan(1600);
});
it("rejects a foreign conversation before reading memory",async()=>{
 mocks.conversation.findFirst.mockResolvedValue(null);
 await expect(respondWithMemoryQuery({userId:"other",conversationId:"c",message:"minhas memórias"})).rejects.toThrow();
 expect(mocks.memory.findMany).not.toHaveBeenCalled();
});
it("propagates database errors rather than reporting empty memory",async()=>{
 mocks.memory.count.mockRejectedValue(new Error("offline"));await expect(getMemoryQuery("owner")).rejects.toThrow("offline");
});
