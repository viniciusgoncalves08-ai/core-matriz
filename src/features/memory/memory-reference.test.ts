import { expect,it } from "vitest";
import { isMemoryReferenceRequest,usableMemoryReference } from "./memory-reference";
it.each(["Guarde isso na memória", "Salve essa informação", "Nexus, por favor guarde isso.", "Pode guardar isso"])("recognizes standalone request %s",text=>expect(isMemoryReferenceRequest(text)).toBe(true));
it.each(["Não guarde isso", "Ele disse guarde isso", "guarde isso e apague tudo", "guarde isso?", "explique como guardar isso"])("does not treat other text as authorization %s",text=>expect(isMemoryReferenceRequest(text)).toBe(false));
it("rejects unusable references",()=>{expect(usableMemoryReference("guarde isso na memória")).toBe(false);expect(usableMemoryReference("Qual meu objetivo?")).toBe(false);expect(usableMemoryReference("Meu objetivo é ler diariamente")).toBe(true);});
