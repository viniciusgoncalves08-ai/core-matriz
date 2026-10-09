import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ generate: vi.fn(), task: vi.fn(), project: vi.fn(), taskEdit: vi.fn(), projectEdit: vi.fn() }));
vi.mock("@/ai/model-router", () => ({ modelRouter: { generate: m.generate } }));
vi.mock("./action-service", () => ({ ProjectSelectionError: class extends Error {}, proposeTask: m.task, proposeProject: m.project, proposeTaskEdit: m.taskEdit, proposeProjectEdit: m.projectEdit }));
import { isNaturalActionRequest, parseNaturalAction, proposeNaturalAction } from "./natural-action";
const params = { userId: "owner", conversationId: "conversation", message: "Preciso ligar amanhã" };
beforeEach(() => vi.clearAllMocks());
it.each(["Preciso ligar para o fornecedor amanhã", "Nexus, pode criar um projeto chamado Loja?", "Conclua a tarefa Ligar", "Pause o projeto Loja"])("routes direct request %s", text => expect(isNaturalActionRequest(text)).toBe(true));
it.each(["Não crie nada", 'Ele disse: crie um projeto', '"Crie uma tarefa"', "Como criar um projeto?", "O que fiz hoje?"])("does not route %s", text => expect(isNaturalActionRequest(text)).toBe(false));
it.each([
 {tool:"task.create",input:{title:"Ligar",dueAt:"2026-02-30"}},
 {tool:"task.create",input:{title:"Ligar",userId:"other"}},
 {tool:"task.update",query:"Ligar",input:{}},
 {tool:"task.update",query:"Ligar",input:{projectId:"other"}},
 {tool:"task.delete",input:{id:"any"}},
 {tool:"project.create",input:{name:"Loja",status:"ARCHIVED"}},
])( "rejects unsafe or unsupported plans %#", plan => expect(() => parseNaturalAction(JSON.stringify(plan))).toThrow());
it("passes validated dates to a proposal without executing or adopting model ownership", async () => {
 m.generate.mockResolvedValue({text:JSON.stringify({tool:"task.create",input:{title:"Ligar",dueAt:"2026-10-10",priority:2}})});
 await proposeNaturalAction(params);
 expect(m.task).toHaveBeenCalledWith(expect.objectContaining({userId:"owner",conversationId:"conversation",input:{title:"Ligar",dueAt:"2026-10-10",priority:2}}));
});
it("only forwards supplied update fields to the owned record resolver", async () => {
 m.generate.mockResolvedValue({text:JSON.stringify({tool:"task.update",query:"Ligar",input:{status:"COMPLETED"}})});
 await proposeNaturalAction(params);
 expect(m.taskEdit).toHaveBeenCalledWith(expect.objectContaining({userId:"owner",query:"Ligar",changes:{status:"COMPLETED"}}));
});
it("asks for clarification without creating a proposal", async () => {
 m.generate.mockResolvedValue({text:'{"tool":"clarify","question":"Qual projeto?"}'});
 await expect(proposeNaturalAction(params)).rejects.toThrow("Qual projeto?");
 expect(m.project).not.toHaveBeenCalled(); expect(m.task).not.toHaveBeenCalled();
});
it("rejects malformed model output without writing", async () => {
 m.generate.mockResolvedValue({text:"Já criei!"});
 await expect(proposeNaturalAction(params)).rejects.toThrow("ação segura");
 expect(m.task).not.toHaveBeenCalled();
});
it("does not save a proposal after cancellation", async () => {
 const controller = new AbortController(); controller.abort();
 m.generate.mockResolvedValue({text:'{"tool":"task.create","input":{"title":"Ligar"}}'});
 await expect(proposeNaturalAction({...params,signal:controller.signal})).rejects.toThrow();
 expect(m.task).not.toHaveBeenCalled();
});
