import { beforeEach, describe, expect, it, vi } from "vitest";
const queries = vi.hoisted(() => ({ memory: { findMany: vi.fn() }, project: { findMany: vi.fn() }, task: { findMany: vi.fn() } }));
vi.mock("@/lib/db", () => ({ db: queries }));
import { buildContext, serializeContext, extractContextTerms } from "./context-engine";

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

beforeEach(() => { vi.clearAllMocks(); for (const query of Object.values(queries)) query.findMany.mockResolvedValue([]); });
it("does not retrieve unrelated private data for greetings", async () => {
  expect(await buildContext("u1", "Oi, como você está?")).toEqual({ memories: [], projects: [], tasks: [] });
  expect(queries.memory.findMany).not.toHaveBeenCalled();
});
it("scopes every domain to the owner and enforces memory validity", async () => {
  await buildContext("u1", "estoque");
  for (const query of Object.values(queries)) expect(query.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: "u1" }) }));
  expect(queries.memory.findMany.mock.calls[0][0].where).toMatchObject({ status: "ACTIVE", validFrom: { lte: expect.any(Date) }, AND: [{ OR: [{ validUntil: null }, { validUntil: { gt: expect.any(Date) } }] }] });
  expect(queries.task.findMany.mock.calls[0][0].where.OR).toEqual([{ title: { contains: "estoque", mode: "insensitive" } }]);
});
it("bounds escaped context while reserving space for every domain", () => {
  const text = '\"'.repeat(12000);
  const serialized = serializeContext({ memories: Array.from({ length: 8 }, (_, i) => ({ id: String(i), summary: null, content: text, classification: "HYPOTHESIS", source: "Usuário", confidence: 0.4 })), projects: [{ id: "p", name: "Projeto", description: null, status: "ACTIVE" }], tasks: [{ id: "t", title: "Tarefa", status: "TODO", dueAt: null }] });
  expect(serialized.length).toBeLessThanOrEqual(12000);
  const parsed = JSON.parse(serialized);
  expect(parsed.memories[0]).toMatchObject({ classification: "HYPOTHESIS", source: "Usuário", confidence: 0.4 });
  expect(parsed.projects).toHaveLength(1); expect(parsed.tasks).toHaveLength(1);
});

it("supports explicit requests to list projects and tasks without requiring those words in titles", async () => {
  await buildContext("u1", "Minhas tarefas");
  expect(queries.task.findMany.mock.calls[0][0].where.OR).toBeUndefined();
  await buildContext("u1", "Meus projetos");
  expect(queries.project.findMany.mock.calls[1][0].where.OR).toBeUndefined();
});
