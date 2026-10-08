import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ user: vi.fn(), get: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSessionUserId: m.user }));
vi.mock("@/features/settings/memory-settings-service", () => ({ getMemorySettings: m.get, saveMemorySettings: m.save }));
import { GET, PATCH } from "./route";
beforeEach(() => { vi.resetAllMocks(); m.user.mockResolvedValue("owner"); m.get.mockResolvedValue({autoMemory:false}); m.save.mockResolvedValue({autoMemory:true}); });
it("requires authentication for reading and writing", async () => {
 m.user.mockResolvedValue(null); expect((await GET()).status).toBe(401);
 expect((await PATCH(new Request("https://example.test",{method:"PATCH",body:'{"autoMemory":true}'}))).status).toBe(401);
 expect(m.get).not.toHaveBeenCalled(); expect(m.save).not.toHaveBeenCalled();
});
it("uses session owner and private cache headers", async () => {
 const r=await GET(); expect(m.get).toHaveBeenCalledWith("owner"); expect(r.headers.get("Cache-Control")).toBe("private, no-store");
 await PATCH(new Request("https://example.test",{method:"PATCH",body:'{"autoMemory":true}'})); expect(m.save).toHaveBeenCalledWith("owner",{autoMemory:true});
});
it("returns safe errors",async()=>{m.get.mockRejectedValue(new Error("secret"));const r=await GET();expect(r.status).toBe(500);expect(await r.text()).not.toContain("secret");});
