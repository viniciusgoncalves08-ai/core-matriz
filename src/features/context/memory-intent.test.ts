import { expect, it } from "vitest";
import { isMemoryProfileRequest } from "./memory-intent";
it("accepts polite standalone profile questions", () => {
 for (const text of ["O que você sabe sobre mim?", "Nexus, por favor, me conte o que você lembra de mim!", "Quero saber o que você tem salvo sobre mim", "Minhas memórias", "Exiba minhas memórias salvas"]) expect(isMemoryProfileRequest(text)).toBe(true);
});
it("does not broaden quoted, negated, unrelated or topic-specific requests", () => {
 for (const text of ['Ele perguntou: o que você sabe sobre mim?', '"minhas memórias"', "Não mostre minhas memórias", "Minhas memórias sobre leitura", "O que você sabe sobre mim e meu projeto", "bom dia"]) expect(isMemoryProfileRequest(text)).toBe(false);
});
