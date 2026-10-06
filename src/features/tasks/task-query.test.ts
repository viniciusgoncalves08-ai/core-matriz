import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ task: { count: vi.fn(), findMany: vi.fn() }, conversation: { findFirst: vi.fn() }, $transaction: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: mocks }));
import { parseTaskQuery, getTaskQuery, formatTaskQuery, respondWithTaskQuery } from "./task-query";
beforeEach(() => { vi.clearAllMocks(); mocks.task.count.mockResolvedValue(0); mocks.task.findMany.mockResolvedValue([]); mocks.$transaction.mockImplementation((queries: Promise<unknown>[]) => Promise.all(queries)); });
it("recognizes standalone queries without interpreting quoted or negated requests", () => {
  expect(parseTaskQuery("Quais são minhas tarefas?")).toBe("open");
  expect(parseTaskQuery("minhas pendências")).toBe("open");
  expect(parseTaskQuery("mostre minhas tarefas atrasadas")).toBe("overdue");
  expect(parseTaskQuery("tarefas sem prazo")).toBe("undated");
  for (const text of ["não mostre minhas tarefas", "ele disse: minhas tarefas", "minhas tarefas e apague tudo"]) expect(parseTaskQuery(text)).toBeNull();
});
it("scopes open tasks to the user and bounds results", async () => {
  await getTaskQuery("owner", "open");
  const query = mocks.task.findMany.mock.calls[0][0];
  expect(query.where.userId).toBe("owner");
  expect(query.where.status.in).not.toContain("COMPLETED");
  expect(query.where.status.in).not.toContain("CANCELLED");
  expect(query.where.dueAt).toBeUndefined();
  expect(query.take).toBe(20);
  expect(mocks.task.count.mock.calls[0][0].where).toEqual(query.where);
});
it("uses Brasilia day boundaries and selects undated tasks explicitly", async () => {
  await getTaskQuery("owner", "overdue", new Date("2026-10-06T01:00:00Z"));
  expect(mocks.task.findMany.mock.calls[0][0].where.dueAt.lt.toISOString()).toBe("2026-10-05T00:00:00.000Z");
  await getTaskQuery("owner", "undated");
  expect(mocks.task.findMany.mock.calls[1][0].where.dueAt).toBeNull();
});
it("escapes titles and discloses truncated results", async () => {
  mocks.task.count.mockResolvedValue(25);
  mocks.task.findMany.mockResolvedValue([{title:"[click](https://example.invalid)",dueAt:null,priority:2,status:"BLOCKED"}]);
  const text = formatTaskQuery(await getTaskQuery("owner", "open"));
  expect(text).toContain("\\[click\\]");
  expect(text).toContain("Exibindo 1 de 25");
  expect(text).toContain("sem prazo");
  expect(text).toContain("Bloqueada");
});
it("rejects a foreign conversation before querying tasks", async () => {
  mocks.conversation.findFirst.mockResolvedValue(null);
  await expect(respondWithTaskQuery({userId:"other",conversationId:"c",message:"minhas tarefas",filter:"open"})).rejects.toThrow();
  expect(mocks.task.count).not.toHaveBeenCalled();
});
it("does not convert a database failure into an empty result", async () => {
  mocks.task.count.mockRejectedValue(new Error("offline"));
  await expect(getTaskQuery("owner", "open")).rejects.toThrow("offline");
});
