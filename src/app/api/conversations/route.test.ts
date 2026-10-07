import {beforeEach,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({user:vi.fn(),count:vi.fn(),findMany:vi.fn(),transaction:vi.fn()}));
vi.mock("@/lib/auth",()=>({getSessionUserId:mocks.user}));
vi.mock("@/lib/db",()=>({db:{conversation:{count:mocks.count,findMany:mocks.findMany},$transaction:mocks.transaction}}));
import {GET} from "./route";
beforeEach(()=>{vi.clearAllMocks();mocks.user.mockResolvedValue("owner");mocks.count.mockResolvedValue(42);mocks.findMany.mockResolvedValue([]);mocks.transaction.mockImplementation((queries:Promise<unknown>[])=>Promise.all(queries));});
it("requires authentication before searching",async()=>{mocks.user.mockResolvedValue(null);expect((await GET(new Request("https://example.test/api/conversations?q=private"))).status).toBe(401);expect(mocks.findMany).not.toHaveBeenCalled();});
it("searches titles and message content only within owned conversations",async()=>{
 const response=await GET(new Request("https://example.test/api/conversations?q=leitura&page=2"));
 const query=mocks.findMany.mock.calls[0][0];expect(query.where).toEqual({userId:"owner",OR:[{title:{contains:"leitura",mode:"insensitive"}},{messages:{some:{content:{contains:"leitura",mode:"insensitive"}}}}]});
 expect(query.skip).toBe(20);expect(query.take).toBe(20);expect(mocks.count.mock.calls[0][0].where).toEqual(query.where);
 expect(await response.json()).toMatchObject({total:42,page:2,hasMore:true});expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
it("returns the last page without a next page and supports empty search",async()=>{mocks.count.mockResolvedValue(21);const response=await GET(new Request("https://example.test/api/conversations?page=2"));expect(await response.json()).toMatchObject({hasMore:false});expect(mocks.findMany.mock.calls[0][0].where).toEqual({userId:"owner"});});
it.each(["page=0","page=1.5","page=-2","q="+"x".repeat(121)])("rejects invalid search %s",async params=>{expect((await GET(new Request("https://example.test/api/conversations?"+params))).status).toBe(400);expect(mocks.findMany).not.toHaveBeenCalled();});
it("handles database failure without claiming an empty result",async()=>{mocks.count.mockRejectedValue(new Error("private database details"));const response=await GET(new Request("https://example.test/api/conversations"));expect(response.status).toBe(500);expect(JSON.stringify(await response.json())).not.toContain("private database details");});
