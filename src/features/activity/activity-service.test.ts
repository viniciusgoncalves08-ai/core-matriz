import { beforeEach, expect, it, vi } from "vitest";
const findMany = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db: { auditLog: { findMany } } }));
import { listActivity } from "./activity-service";
beforeEach(() => { vi.clearAllMocks(); findMany.mockResolvedValue([]); });
it("restricts filtered activity to its owner and excludes raw error payloads", async () => {
  await listActivity("u1", { kind: "memory", result: "failure", page: 2 });
  const query = findMany.mock.calls[0][0];
  expect(query.where).toEqual({ userId: "u1", entityType: "memory", success: false });
  expect(query.skip).toBe(25); expect(query.select.error).toBeUndefined(); expect(query.select.metadata).toBeUndefined();
});
it("paginates without dropping the next-page indicator", async () => {
  findMany.mockResolvedValue(Array.from({ length: 26 }, (_, id) => ({ id })));
  const result = await listActivity("u1", {});
  expect(result.items).toHaveLength(25); expect(result.hasMore).toBe(true);
});
it("rejects invalid filters before querying the database", async () => {
  await expect(listActivity("u1", { page: -1 })).rejects.toThrow();
  await expect(listActivity("u1", { kind: "invalid" })).rejects.toThrow();
  expect(findMany).not.toHaveBeenCalled();
});
