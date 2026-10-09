import { expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ find: vi.fn(), create: vi.fn().mockResolvedValue({id:"proposal"}) }));
vi.mock("@/lib/db", () => ({db:{task:{findMany:m.find},$transaction:async (fn: (tx:unknown)=>unknown)=>fn({conversation:{findFirst:vi.fn().mockResolvedValue({id:"c"}),update:vi.fn()},message:{create:m.create},auditLog:{create:vi.fn()}})}}));
import { proposeTaskEdit } from "./action-service";
it("resolves only owned exact matches and preserves fields omitted by the planner", async () => {
 m.find.mockResolvedValue([{id:"task",title:"Ligar",dueAt:new Date("2026-11-01T00:00:00Z"),priority:3,status:"TODO",updatedAt:new Date("2026-10-09T00:00:00Z")}]);
 await proposeTaskEdit({userId:"owner",conversationId:"c",message:"Conclua a tarefa Ligar",query:"Ligar",changes:{status:"COMPLETED"}});
 expect(m.find).toHaveBeenCalledWith(expect.objectContaining({where:{userId:"owner",OR:[{id:"Ligar"},{title:{equals:"Ligar",mode:"insensitive"}}]}}));
 expect(m.create).toHaveBeenLastCalledWith(expect.objectContaining({data:expect.objectContaining({metadata:expect.objectContaining({action:expect.objectContaining({status:"pending",expectedUpdatedAt:"2026-10-09T00:00:00.000Z",input:{title:"Ligar",dueAt:"2026-11-01",priority:3,status:"COMPLETED"}})})})}));
});
it("does not choose a record arbitrarily when names are duplicated", async () => {
 m.create.mockClear();m.find.mockResolvedValue([{id:"a"},{id:"b"}]);
 await expect(proposeTaskEdit({userId:"owner",conversationId:"c",message:"Conclua Ligar",query:"Ligar",changes:{status:"COMPLETED"}})).rejects.toThrow("mais de uma");
 expect(m.create).not.toHaveBeenCalled();
});
