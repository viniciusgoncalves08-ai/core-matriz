import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { OpenAIProvider } from "./openai-provider";
const request = { messages: [{ role: "user" as const, content: "Olá" }], temperature: 0.3 };
beforeEach(() => vi.stubEnv("OPENAI_API_KEY", "test-only-key"));
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("omits unsupported temperature for GPT-5 and accepts text", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "OK" } }], model: "gpt-5" })));
  vi.stubGlobal("fetch", fetcher);
  expect((await new OpenAIProvider().generate({ ...request, model: "gpt-5" })).text).toBe("OK");
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).not.toHaveProperty("temperature");
});
it("preserves sampling temperature for GPT-4.1", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "OK" } }] })));
  vi.stubGlobal("fetch", fetcher);
  await new OpenAIProvider().generate({ ...request, model: "gpt-4.1" });
  expect(JSON.parse(fetcher.mock.calls[0][1].body).temperature).toBe(0.3);
});
it("does not transmit requests with a blank API key", async () => {
  vi.stubEnv("OPENAI_API_KEY", "  "); const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  await expect(new OpenAIProvider().generate(request)).rejects.toMatchObject({ code: "AI_NOT_CONFIGURED" });
  expect(fetcher).not.toHaveBeenCalled();
});
it("maps authentication errors without exposing raw provider payload", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "invalid_api_key", message: "private-debug-payload" } }), { status: 401 })));
  await expect(new OpenAIProvider().generate(request)).rejects.toMatchObject({ code: "AI_AUTH_FAILED" });
});
it("rejects an empty response", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [] }))));
  await expect(new OpenAIProvider().generate(request)).rejects.toMatchObject({ code: "AI_EMPTY_RESPONSE" });
});
it("distinguishes quota from temporary rate limits", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "insufficient_quota" } }), { status: 429 })));
  await expect(new OpenAIProvider().generate(request)).rejects.toMatchObject({ code: "AI_QUOTA_EXCEEDED" });
});
