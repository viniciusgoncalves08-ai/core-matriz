import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), list: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSessionUserId: mocks.user }));
vi.mock("@/features/memory/memory-service", () => ({ listMemories: mocks.list, createMemory: vi.fn() }));
import { GET } from "./route";
beforeEach(() => { vi.resetAllMocks(); mocks.user.mockResolvedValue("owner"); mocks.list.mockResolvedValue({ memories: [], total: 0, page: 1, hasMore: false }); });
it("requires a session before querying private memories", async () => {
  mocks.user.mockResolvedValue(null);
  const response = await GET(new Request("https://example.test/api/memories"));
  expect(response.status).toBe(401); expect(mocks.list).not.toHaveBeenCalled();
});
it("validates and forwards filters with the authenticated owner", async () => {
  const response = await GET(new Request("https://example.test/api/memories?q=%20leitura%20&classification=PREFERENCE&status=BLOCKED&page=2&userId=other"));
  expect(mocks.list).toHaveBeenCalledWith("owner", { q: "leitura", classification: "PREFERENCE", status: "BLOCKED", page: 2 });
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
it.each(["status=DELETED", "status=unknown", "classification=unknown", "page=0", "page=1.5", "q=" + "x".repeat(121)])("rejects invalid filter %s", async params => {
  expect((await GET(new Request("https://example.test/api/memories?" + params))).status).toBe(400);
  expect(mocks.list).not.toHaveBeenCalled();
});
it("returns a safe error rather than an empty list on database failure", async () => {
  mocks.list.mockRejectedValue(new Error("private connection string"));
  const response = await GET(new Request("https://example.test/api/memories"));
  expect(response.status).toBe(500); expect(await response.text()).not.toContain("private connection string");
});
