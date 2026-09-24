import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ goal: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() }, project: { findFirst: vi.fn() }, auditLog: { create: vi.fn() } }));
vi.mock("@/lib/db", () => ({ db: { ...mock, $transaction: (fn: (tx: typeof mock) => unknown) => fn(mock) } }));
import { listGoals, saveGoal } from "./goal-service";
import { WorkNotFoundError } from "@/features/projects/work-service";
beforeEach(() => {
 vi.resetAllMocks();
 mock.goal.create.mockImplementation(async ({data}) => ({id:"g",...data}));
 mock.goal.update.mockImplementation(async ({data}) => ({id:"g",...data}));
 mock.goal.findFirst.mockResolvedValue({id:"g",status:"active",progress:35});
});
it("requires goal ownership before updating", async () => {
 mock.goal.findFirst.mockResolvedValue(null);
 await expect(saveGoal("u",{title:"Changed"},"foreign")).rejects.toBeInstanceOf(WorkNotFoundError);
 expect(mock.goal.update).not.toHaveBeenCalled();
 expect(mock.goal.findFirst).toHaveBeenCalledWith({where:{id:"foreign",userId:"u"}});
});
it("rejects foreign project relationships", async () => {
 mock.project.findFirst.mockResolvedValue(null);
 await expect(saveGoal("u",{title:"New goal",projectId:"foreign"})).rejects.toBeInstanceOf(WorkNotFoundError);
 expect(mock.goal.create).not.toHaveBeenCalled();
});
it("completion sets progress to 100 and records the change", async () => {
 const goal=await saveGoal("u",{status:"completed",progress:10},"g");
 expect(goal.progress).toBe(100);
 expect(mock.auditLog.create).toHaveBeenCalledWith({data:expect.objectContaining({userId:"u",entityId:"g",action:"GOAL_UPDATED",metadata:expect.objectContaining({before:{status:"active",progress:35},after:{status:"completed",progress:100}})})});
});
it("preserves existing progress for unrelated edits", async () => {
 await saveGoal("u",{title:"Renamed"},"g");
 expect(mock.goal.update).toHaveBeenCalledWith({where:{id:"g",userId:"u"},data:{title:"Renamed",status:"active",progress:35}});
});
it("allows clearing deadline and project", async () => {
 await saveGoal("u",{dueAt:null,projectId:null},"g");
 expect(mock.goal.update.mock.calls[0][0].data).toMatchObject({dueAt:null,projectId:null});
});
it.each([{title:"ok",progress:101},{title:"ok",progress:-1},{title:"ok",progress:0.5},{title:"ok",userId:"other"},{title:"ok",dueAt:"2026-02-30"},{title:"ok",status:"fake"}])("validates input", async input => {
 await expect(saveGoal("u",input)).rejects.toThrow();
 expect(mock.goal.create).not.toHaveBeenCalled();
});
it("scopes goal listing to the current user", async () => {
 await listGoals("u");
 expect(mock.goal.findMany).toHaveBeenCalledWith(expect.objectContaining({where:{userId:"u"}}));
});
