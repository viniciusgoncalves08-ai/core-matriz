import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), task: { findMany: vi.fn() }, project: { findMany: vi.fn() }, goal: { findMany: vi.fn() }, memory: { findMany: vi.fn() }, conversation: { findMany: vi.fn() } }));
vi.mock("@/lib/db", () => ({ db: m }));
vi.mock("@/lib/auth", () => ({ getSessionUserId: m.session }));
import { globalSearch } from "./search-service";
import { GET } from "@/app/api/search/route";
beforeEach(() => { vi.clearAllMocks(); for (const model of [m.task,m.project,m.goal,m.memory,m.conversation]) model.findMany.mockResolvedValue([]); });
it("rejects anonymous requests before querying the database", async () => {
 m.session.mockResolvedValue(null);
 expect((await GET(new Request("http://localhost/api/search?q=teste"))).status).toBe(401);
 expect(m.task.findMany).not.toHaveBeenCalled();
});
it("rejects invalid input and injected ownership fields", async () => {
 m.session.mockResolvedValue("owner");
 for (const query of ["q=x", "q=teste&kind=invalid", "q=teste&userId=other"]) expect((await GET(new Request(`http://localhost/api/search?${query}`))).status).toBe(400);
 expect(m.task.findMany).not.toHaveBeenCalled();
});
it("uses authenticated ownership on all queries and prevents caching", async () => {
 m.session.mockResolvedValue("owner");
 const response = await GET(new Request("http://localhost/api/search?q=teste"));
 expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("private, no-store");
 for (const model of [m.task,m.project,m.goal,m.memory,m.conversation]) expect(model.findMany.mock.calls[0][0].where.userId).toBe("owner");
});
it("filters categories and links to the actual conversation route", async () => {
 m.conversation.findMany.mockResolvedValue([{id:"conversation-1",title:"Teste"}]);
 const result = await globalSearch("owner", { q:"teste",kind:"conversations" });
 expect(result.results[0].href).toBe("/historico/conversation-1"); expect(m.task.findMany).not.toHaveBeenCalled();
});
it("caps each category with explicit indication that results remain", async () => {
 m.task.findMany.mockResolvedValue(Array.from({length:11},(_,i)=>({id:String(i),title:"Teste",description:null})));
 const result = await globalSearch("owner", {q:"teste"});
 expect(result.results).toHaveLength(10); expect(result.limited).toBe(true);
});
it("hides internal database errors", async () => {
 m.session.mockResolvedValue("owner");m.task.findMany.mockRejectedValue(new Error("secret connection"));
 const response=await GET(new Request("http://localhost/api/search?q=teste"));
 expect(response.status).toBe(500);expect(await response.text()).not.toContain("secret");
});
