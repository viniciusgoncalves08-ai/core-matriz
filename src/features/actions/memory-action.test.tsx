import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ActionCard } from "./action-cards";
import { parseMemoryCommand, suggestMemoryClassification, memoryActionInput, type ActionView } from "./action-schema";
it("accepts direct memory requests with multiline content and preserves user wording", () => {
 expect(parseMemoryCommand("Lembre que prefiro ler à noite.")).toBe("prefiro ler à noite.");
 expect(parseMemoryCommand("salve na memória: Dia 1\nDia 2")).toBe("Dia 1\nDia 2");
 expect(parseMemoryCommand("/memoria Contexto importante")).toBe("Contexto importante");
 expect(parseMemoryCommand("Ele disse: lembre que prefiro ler")).toBeNull();
 expect(parseMemoryCommand('"lembre que prefiro ler"')).toBeNull();
 expect(parseMemoryCommand("Não salve na memória: segredo")).toBeNull();
 expect(parseMemoryCommand("lembre que " + "x".repeat(12001))).toBeNull();
});
it("defaults to context instead of asserting a fact and rejects forged ownership", () => {
 expect(memoryActionInput.parse({content:"Informação"}).classification).toBe("CONTEXT");
 expect(memoryActionInput.safeParse({content:"Informação",userId:"other"}).success).toBe(false);
});
it("renders memory review and only links to memory after confirmed success", () => {
 const action:ActionView={id:"m",version:1,tool:"memory.create",permission:"CONFIRM",status:"pending",expiresAt:"2026-12-25T00:00:00.000Z",input:{content:"Prefiro ler",classification:"PREFERENCE"}};
 const pending=renderToStaticMarkup(<ActionCard action={action} onUpdate={()=>{}} />);
 expect(pending).toContain("Confirmar e salvar memória");
 expect(pending).toContain("Classificação");
 expect(pending).not.toContain("Memória salva");
 const saved=renderToStaticMarkup(<ActionCard action={{...action,status:"succeeded",memoryId:"saved"}} onUpdate={()=>{}} />);
 expect(saved).toContain('href="/memoria"');
 expect(saved).not.toContain("Confirmar e salvar memória");
});

it("accepts natural direct memory requests without changing the content", () => {
 for (const prefix of ["Guarde que ", "Pode guardar que ", "Quero que você lembre que ", "Nexus, por favor, registre na memória que ", "Você pode lembrar que "]) {
   expect(parseMemoryCommand(prefix + "prefiro ler à noite.")).toBe("prefiro ler à noite.");
 }
 for (const text of ["Não guarde que prefiro ler", "Se eu disser guarde que prefiro ler", 'Ele disse: guarde que prefiro ler', '"Guarde que prefiro ler"', "Guarde isso", "Pode guardar?", "Quero que você lembre que "]) expect(parseMemoryCommand(text)).toBeNull();
});
it("suggests conservative classifications, giving uncertainty precedence", () => {
 expect(suggestMemoryClassification("Eu prefiro ler à noite")).toBe("PREFERENCE");
 expect(suggestMemoryClassification("Decidi estudar de manhã")).toBe("DECISION");
 expect(suggestMemoryClassification("Minha meta é ler 12 livros")).toBe("GOAL");
 expect(suggestMemoryClassification("Prefiro ler à noite, mas talvez isso mude")).toBe("HYPOTHESIS");
 expect(suggestMemoryClassification("Acredito que trabalho melhor à noite")).toBe("HYPOTHESIS");
 expect(suggestMemoryClassification("Trabalho de casa")).toBe("CONTEXT");
 expect(suggestMemoryClassification("Ele disse que prefiro ler")).toBe("CONTEXT");
});
