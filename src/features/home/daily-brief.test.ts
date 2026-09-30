import { beforeEach, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({task:{count:vi.fn(),findMany:vi.fn()},project:{findMany:vi.fn()},goal:{findMany:vi.fn()},conversation:{findFirst:vi.fn()}}));
vi.mock("@/lib/db",()=>({db:mocks}));
import { getDailyBrief, formatDailyBrief, isDailyBriefRequest, respondWithDailyBrief } from "./daily-brief";
beforeEach(()=>{vi.clearAllMocks();mocks.task.count.mockResolvedValue(0);mocks.task.findMany.mockResolvedValue([]);mocks.project.findMany.mockResolvedValue([]);mocks.goal.findMany.mockResolvedValue([]);});
it("recognizes only standalone briefing requests",()=>{
 for(const s of ["Bom dia!","Bom dia, Nexus!","resumo do dia","Como está meu dia?"]) expect(isDailyBriefRequest(s)).toBe(true);
 for(const s of ['Ele disse bom dia','bom dia, crie um projeto','Não quero resumo do dia']) expect(isDailyBriefRequest(s)).toBe(false);
});
it("scopes every query and uses Brasilia dates, excluding future tasks and closed records",async()=>{
 const data=await getDailyBrief("owner",new Date("2026-10-01T01:00:00Z"));
 expect(data.date).toBe("2026-09-30");
 for(const fn of [mocks.task.count,mocks.task.findMany,mocks.project.findMany,mocks.goal.findMany]) for(const [args] of fn.mock.calls) expect(args.where.userId).toBe("owner");
 expect(mocks.task.findMany.mock.calls[0][0].where.dueAt.lt.toISOString()).toBe("2026-10-01T00:00:00.000Z");
 expect(mocks.goal.findMany.mock.calls[0][0].where.dueAt.lt.toISOString()).toBe("2026-10-07T00:00:00.000Z");
 expect(mocks.project.findMany.mock.calls[0][0].where.status).toBe("ACTIVE");
 expect(mocks.task.findMany.mock.calls[0][0].where.status.in).not.toContain("COMPLETED");
 expect(formatDailyBrief(data)).toContain("Nenhuma tarefa em aberto com prazo até hoje");
});
it("escapes stored titles and reports bounded results rather than invented actions",async()=>{
 mocks.task.count.mockResolvedValueOnce(8).mockResolvedValueOnce(2);
 mocks.task.findMany.mockResolvedValue([{id:"t",title:"[pagar](https://evil.example)",dueAt:new Date("2026-09-29"),priority:1,status:"BLOCKED"}]);
 const text=formatDailyBrief(await getDailyBrief("u",new Date("2026-09-30T12:00:00Z")));
 expect(text).toContain("8 atrasada(s) e 2 com prazo hoje");
 expect(text).toContain("\\[pagar\\]");
 expect(text).toContain("bloqueada");
 expect(text).toContain("não ativa lembretes");
});
it("does not read personal records for a foreign conversation",async()=>{
 mocks.conversation.findFirst.mockResolvedValue(null);
 await expect(respondWithDailyBrief({userId:"other",conversationId:"c",message:"bom dia"})).rejects.toThrow();
 expect(mocks.task.count).not.toHaveBeenCalled();
});
it("propagates database failures rather than claiming no tasks",async()=>{
 mocks.task.count.mockRejectedValue(new Error("offline"));
 await expect(getDailyBrief("u")).rejects.toThrow("offline");
});
