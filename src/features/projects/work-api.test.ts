import { beforeEach, expect, it, vi } from "vitest";
const session = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ getSessionUserId: session }));
import { workResponse } from "./work-api";
import { WorkNotFoundError } from "./work-service";
beforeEach(() => session.mockResolvedValue("u1"));
it("rejects unauthenticated access before running the operation", async () => {
  session.mockResolvedValue(null); const action = vi.fn();
  expect((await workResponse(action)).status).toBe(401); expect(action).not.toHaveBeenCalled();
});
it("returns 404 for inaccessible records", async () => {
  expect((await workResponse(async () => { throw new WorkNotFoundError(); })).status).toBe(404);
});
it("returns 400 for malformed request JSON", async () => {
  expect((await workResponse(async () => { throw new SyntaxError(); })).status).toBe(400);
});
it("does not disclose raw database errors", async () => {
  const response = await workResponse(async () => { throw new Error("database-secret"); });
  expect(response.status).toBe(500); expect(await response.text()).not.toContain("database-secret");
});
