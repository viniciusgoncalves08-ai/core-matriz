import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ session: vi.fn(), get: vi.fn(), change: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSessionUserId: m.session }));
vi.mock("./project-link-service", () => ({ getProjectLink: m.get, changeProjectLink: m.change, ProjectLinkNotFound: class extends Error {}, ProjectLinkConflict: class extends Error {} }));
import { GET, PATCH } from "@/app/api/project-links/route";
import { ProjectLinkConflict } from "./project-link-service";
beforeEach(() => { vi.clearAllMocks(); });
it("requires authentication for reads and changes", async () => {
  m.session.mockResolvedValue(null);
  expect((await GET(new Request("http://localhost/api/project-links?kind=memory&id=m"))).status).toBe(401);
  expect((await PATCH(new Request("http://localhost/api/project-links", { method: "PATCH", body: "{}" }))).status).toBe(401);
  expect(m.get).not.toHaveBeenCalled(); expect(m.change).not.toHaveBeenCalled();
});
it("uses session identity, disables caching and reports conflicts", async () => {
  m.session.mockResolvedValue("owner"); m.get.mockResolvedValue({ projectId: null, projects: [] });
  const r = await GET(new Request("http://localhost/api/project-links?kind=memory&id=m"));
  expect(r.status).toBe(200); expect(r.headers.get("Cache-Control")).toBe("private, no-store");
  expect(m.get).toHaveBeenCalledWith("owner", { kind: "memory", id: "m" });
  m.change.mockRejectedValue(new ProjectLinkConflict());
  expect((await PATCH(new Request("http://localhost/api/project-links", { method: "PATCH", body: "{}" }))).status).toBe(409);
});
it("does not expose database errors", async () => {
  m.session.mockResolvedValue("owner"); m.get.mockRejectedValue(new Error("secret database"));
  const r = await GET(new Request("http://localhost/api/project-links"));
  expect(r.status).toBe(500); expect(await r.text()).not.toContain("secret");
});
