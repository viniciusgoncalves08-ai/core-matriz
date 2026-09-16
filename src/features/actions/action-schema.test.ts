import { describe, expect, it } from "vitest";
import { parseTaskCommand, actionDecision } from "./action-schema";
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
