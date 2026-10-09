import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ generate: vi.fn(), task: vi.fn(), project: vi.fn(), taskEdit: vi.fn(), projectEdit: vi.fn(), goal: vi.fn(), goalEdit: vi.fn() }));
vi.mock("@/ai/model-router", () => ({ modelRouter: { generate: m.generate } }));
vi.mock("./action-service", () => ({ ProjectSelectionError: class extends Error {}, proposeTask: m.task, proposeProject: m.project, proposeTaskEdit: m.taskEdit, proposeProjectEdit: m.projectEdit, proposeGoal: m.goal, proposeGoalEdit: m.goalEdit }));
import { isNaturalActionRequest, parseNaturalAction, proposeNaturalAction } from "./natural-action";
const params = { userId: "owner", conversationId: "conversation", message: "Preciso ligar amanhã" };
beforeEach(() => vi.clearAllMocks());
it.each(["Preciso ligar para o fornecedor amanhã", "Nexus, pode criar um projeto chamado Loja?", "Conclua a tarefa Ligar", "Pause o projeto Loja", "Vincule o objetivo Curso ao projeto Estudos", "Desvincule o objetivo Curso do projeto"])("routes direct request %s", text => expect(isNaturalActionRequest(text)).toBe(true));
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

it("plans a goal linked by name without accepting model-generated identifiers", async () => {
 m.generate.mockResolvedValue({text:JSON.stringify({tool:"goal.create",input:{title:"Terminar curso",dueAt:"2026-12-20",projectName:"Estudos"}})});
 await proposeNaturalAction({...params,message:"Crie o objetivo Terminar curso no projeto Estudos"});
 expect(m.goal).toHaveBeenCalledWith(expect.objectContaining({userId:"owner",projectName:"Estudos",input:expect.objectContaining({title:"Terminar curso",dueAt:"2026-12-20"})}));
});
it("does not introduce defaults into goal updates", async () => {
 m.generate.mockResolvedValue({text:JSON.stringify({tool:"goal.update",query:"Curso",input:{progress:40}})});
 await proposeNaturalAction(params);
 expect(m.goalEdit).toHaveBeenCalledWith(expect.objectContaining({query:"Curso",changes:{progress:40},projectName:undefined}));
});
it.each([
 {tool:"goal.create",input:{title:"Curso",projectId:"foreign"}},
 {tool:"goal.update",query:"Curso",input:{}},
 {tool:"goal.update",query:"Curso",input:{progress:101}},
 {tool:"goal.update",query:"Curso",input:{progress:-1}},
 {tool:"goal.update",query:"Curso",input:{userId:"foreign"}},
 {tool:"goal.update",query:"Curso",input:{dueAt:"2026-02-30"}},
])("rejects unsafe goal plan %#", plan=>expect(()=>parseNaturalAction(JSON.stringify(plan))).toThrow());
