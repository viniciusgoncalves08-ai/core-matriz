import { beforeEach, expect, it, vi } from "vitest";
const { session }=vi.hoisted(()=>({session:vi.fn()}));
vi.mock("@/lib/auth",()=>({getSessionUserId:session}));
import { actionResponse } from "./action-api";
import { ActionNotFoundError } from "./action-service";
beforeEach(()=>{vi.clearAllMocks();session.mockResolvedValue("owner");});
it("does not run operations without a session",async()=>{
 session.mockResolvedValue(null);const operation=vi.fn();
 expect((await actionResponse(operation)).status).toBe(401);
 expect(operation).not.toHaveBeenCalled();
});
it("passes authenticated ownership and disables caching",async()=>{
 const operation=vi.fn().mockResolvedValue({actions:[]});
 const response=await actionResponse(operation);
 expect(operation).toHaveBeenCalledWith("owner");
 expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
it("hides database errors",async()=>{
 const response=await actionResponse(async()=>{throw new Error("postgres://secret");});
 expect(response.status).toBe(500);
 expect(await response.text()).not.toContain("postgres");
});
it("returns 404 for inaccessible actions",async()=>{
 expect((await actionResponse(async()=>{throw new ActionNotFoundError();})).status).toBe(404);
});
