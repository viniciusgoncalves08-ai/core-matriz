import { expect, it } from "vitest";
import { appendDictation, spokenText, recognitionError } from "./voice-text";
it("preserves typed draft and limits dictated input",()=>{
 expect(appendDictation("Bom dia", " Nexus ")).toBe("Bom dia Nexus");
 expect(appendDictation("x".repeat(12000),"extra")).toHaveLength(12000);
});
it("reads link labels, omits code and limits lengthy answers",()=>{
 const text=spokenText("# Resumo\n[Projetos](/projetos)\n```js\nalert('secret')\n```");
 expect(text).toContain("Projetos");expect(text).not.toContain("alert");expect(text).not.toContain("/projetos");
 expect(spokenText("a".repeat(7000))).toHaveLength(6000);
});
it("explains denied microphone and unavailable capture",()=>{
 expect(recognitionError("not-allowed")).toContain("não foi autorizado");
 expect(recognitionError("audio-capture")).toContain("Microfone indisponível");
});
