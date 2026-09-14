import { describe, expect, it } from "vitest";
import { extractContextTerms } from "./context-engine";

describe("extractContextTerms", () => {
  it("normaliza, remove termos curtos e elimina duplicatas", () => {
    expect(extractContextTerms("Projeto Vivessence, projeto novo e estoque baixo")).toEqual([
      "projeto",
      "vivessence",
      "novo",
      "estoque",
      "baixo",
    ]);
  });

  it("limita o contexto a oito termos", () => {
    const result = extractContextTerms("alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo");
    expect(result).toHaveLength(8);
  });
});
