import { expect, it, vi } from "vitest";
const find = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db",()=>({db:{memory:{findFirst:find}}}));
import { getMemoryDetail } from "./memory-detail-service";
it("restricts the detail and its versions to the authenticated owner",async()=>{find.mockResolvedValue(null);expect(await getMemoryDetail("owner","memory")).toBeNull();expect(find).toHaveBeenLastCalledWith(expect.objectContaining({where:{id:"memory",userId:"owner"},select:expect.objectContaining({versions:expect.objectContaining({take:10})})}));});
it("does not expose deleted content or versions through an old link",async()=>{find.mockResolvedValue({id:"m",status:"DELETED",content:"private",versions:[{content:"old private"}]});expect(await getMemoryDetail("u","m")).toEqual({id:"m",status:"DELETED"});});
it("preserves blocked records for owner review",async()=>{const data={id:"m",status:"BLOCKED",content:"review",versions:[]};find.mockResolvedValue(data);expect(await getMemoryDetail("u","m")).toEqual(data);});
