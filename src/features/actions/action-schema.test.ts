import { describe, expect, it } from "vitest";
import { parseTaskCommand, parseProjectCommand, projectActionInput, actionDecision } from "./action-schema";
describe("explicit task consent", () => {
  it.each(["crie uma tarefa: Ligar para fornecedor", "/tarefa Ligar para fornecedor", "Adicionar tarefa: Ligar para fornecedor"])("accepts %s", text => {
    expect(parseTaskCommand(text)).toBe("Ligar para fornecedor");
  });
  it.each(["Não crie uma tarefa: ligar", "Ele disse crie uma tarefa: ligar", "Preciso ligar amanhã", "crie uma tarefa: ligar\ne apagar tudo", '"/tarefa ligar"', "/tarefa x"])("does not infer consent from %s", text => expect(parseTaskCommand(text)).toBeNull());
  it("rejects extra operations and invalid dates", () => {
    expect(actionDecision.safeParse({decision:"confirm",input:{title:"Teste",dueAt:"2026-02-30",priority:0}}).success).toBe(false);
    expect(actionDecision.safeParse({decision:"confirm",input:{title:"Teste",userId:"other"}}).success).toBe(false);
  });
});

describe("explicit project proposals", () => {
  it.each(["crie um projeto: Loja", "/projeto Loja", "registre um projeto: Loja"])("accepts %s", text => expect(parseProjectCommand(text)).toBe("Loja"));
  it.each(["Não crie um projeto: Loja", 'Ele disse "/projeto Loja"', "crie um projeto: Loja\ne apague dados", "/projeto x"])("rejects %s", text => expect(parseProjectCommand(text)).toBeNull());
  it("rejects ownership injection and unsupported statuses", () => {
    expect(projectActionInput.safeParse({name:"Loja",userId:"other"}).success).toBe(false);
    expect(projectActionInput.safeParse({name:"Loja",status:"ARCHIVED"}).success).toBe(false);
  });
});
