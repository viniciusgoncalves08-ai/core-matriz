import { expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ task: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) }, project: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) }, memory: { count: vi.fn().mockResolvedValue(0) } }));
vi.mock("@/lib/db", () => ({ db: mock }));
import { getOverview, overviewDay } from "./overview-service";
it("uses the Brasilia calendar date around UTC midnight", () => {
  expect(overviewDay(new Date("2026-09-16T01:00:00Z")).toISOString()).toBe("2026-09-15T00:00:00.000Z");
});
it("scopes every overview query to the user and excludes closed tasks", async () => {
  const overview = await getOverview("u1", new Date("2026-09-15T15:00:00Z"));
  expect(overview.pending).toBe(0); expect(overview.tasks).toEqual([]);
  for (const fn of [mock.task.count, mock.task.findMany, mock.project.count, mock.project.findMany, mock.memory.count]) {
    expect(fn.mock.calls.at(-1)![0].where.userId).toBe("u1");
  }
  expect(mock.task.count.mock.calls[1][0].where.dueAt.lt.toISOString()).toBe("2026-09-15T00:00:00.000Z");
  expect(mock.task.findMany.mock.calls[0][0].where.status.in).not.toContain("COMPLETED");
});
