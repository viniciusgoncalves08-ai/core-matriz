import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), agent: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSessionUserId: mocks.session }));
vi.mock("@/lib/db", () => ({ db: { agent: { findFirst: mocks.agent } } }));
import { GET } from "./route";
beforeEach(() => {
  vi.clearAllMocks(); mocks.session.mockResolvedValue("u1"); mocks.agent.mockResolvedValue({ preferredModel: "gemini-2.5-flash-lite" });
  vi.stubEnv("AI_DEFAULT_PROVIDER", "gemini"); vi.stubEnv("AI_DEFAULT_MODEL", ""); vi.stubEnv("GEMINI_API_KEY", "private-test-key"); vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("rejects anonymous access without reading the database or provider", async () => {
  mocks.session.mockResolvedValue(null);
  expect((await GET()).status).toBe(401); expect(mocks.agent).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
});
it("reports the actual selected model and catalog without revealing keys", async () => {
  mocks.fetch.mockResolvedValue(Response.json({ models: [{ name: "models/gemini-2.5-flash-lite", supportedGenerationMethods: ["generateContent"] }] }));
  const response = await GET(); const text = await response.text();
  expect(text).not.toContain("private-test-key"); expect(JSON.parse(text)).toMatchObject({ provider: "gemini", modelListed: true, catalogStatus: 200 });
  expect(mocks.agent).toHaveBeenCalledWith({ where: { userId: "u1", slug: "nexus" }, select: { preferredModel: true } });
  expect(response.headers.get("Cache-Control")).toContain("no-store");
});
it("never discloses provider error bodies", async () => {
  mocks.fetch.mockResolvedValue(new Response("private-test-key provider error", { status: 403 }));
  const response = await GET(); expect(await response.json()).toMatchObject({ catalogStatus: 403 });
});
it("identifies implicit OpenAI selection without calling Gemini", async () => {
  vi.stubEnv("AI_DEFAULT_PROVIDER", "");
  const response = await GET(); expect(await response.json()).toMatchObject({ provider: "openai", providerExplicit: false }); expect(mocks.fetch).not.toHaveBeenCalled();
});
