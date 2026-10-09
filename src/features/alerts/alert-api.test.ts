import { beforeEach, expect, it, vi } from "vitest";
const m=vi.hoisted(()=>({session:vi.fn(),get:vi.fn(),mark:vi.fn()}));
vi.mock("@/lib/auth",()=>({getSessionUserId:m.session}));
vi.mock("./alert-service",()=>({getDeadlineAlerts:m.get,markDeadlineAlertRead:m.mark}));
import { GET,PATCH } from "@/app/api/alerts/route";
beforeEach(()=>vi.clearAllMocks());
it("blocks unauthenticated reads and writes",async()=>{
 m.session.mockResolvedValue(null);
 expect((await GET()).status).toBe(401);
 expect((await PATCH(new Request("http://localhost",{method:"PATCH",body:"{}"}))).status).toBe(401);
 expect(m.get).not.toHaveBeenCalled();expect(m.mark).not.toHaveBeenCalled();
});
it("never caches personal alerts publicly",async()=>{
 m.session.mockResolvedValue("owner");m.get.mockResolvedValue({alerts:[]});
 const response=await GET();expect(response.headers.get("Cache-Control")).toBe("private, no-store");expect(m.get).toHaveBeenCalledWith("owner");
});
it("hides internal database failures",async()=>{
 m.session.mockResolvedValue("owner");m.get.mockRejectedValue(new Error("secret database connection"));
 const response=await GET();expect(response.status).toBe(500);expect(await response.text()).not.toContain("secret");
});
it("does not report success for stale or foreign alerts",async()=>{
 m.session.mockResolvedValue("owner");m.mark.mockResolvedValue(false);
 expect((await PATCH(new Request("http://localhost",{method:"PATCH",body:JSON.stringify({kind:"task",id:"other",dueDate:"2026-10-08"})}))).status).toBe(404);
});
