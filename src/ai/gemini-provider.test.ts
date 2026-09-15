import { afterEach, expect, it, vi } from "vitest";
import { ModelRouter } from "./model-router";
import { getModelTarget } from "./model-target";
import { GeminiProvider } from "./gemini-provider";
const messages = [{ role: "system" as const, content: "Contexto" }, { role: "user" as const, content: "Olá" }];
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("routes Gemini to Google with context and bounded output", async () => {
  vi.stubEnv("GEMINI_API_KEY", " test-key ");
  vi.stubEnv("AI_DEFAULT_PROVIDER", "gemini");
  vi.stubEnv("AI_DEFAULT_MODEL", "gpt-5");
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: "Olá!" } }] })));
  vi.stubGlobal("fetch", fetcher);
  const result = await new ModelRouter().generate({ messages }, [getModelTarget("gpt-5")]);
  expect(result).toEqual({ text: "Olá!", model: "gemini-2.5-flash-lite", provider: "gemini" });
  const [url, init] = fetcher.mock.calls[0];
  expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
  expect(init.headers.authorization).toBe("Bearer test-key");
  expect(JSON.parse(init.body)).toMatchObject({ messages, max_tokens: 2048 });
});
it("does not use OpenAI or retry when Gemini quota is exhausted", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubEnv("OPENAI_API_KEY", "unused-key");
  const fetcher = vi.fn().mockResolvedValue(new Response('{"error":{"message":"private detail"}}', { status: 429 }));
  vi.stubGlobal("fetch", fetcher);
  await expect(new ModelRouter().generate({ messages }, [{ provider: "gemini" }])).rejects.toMatchObject({ code: "AI_QUOTA_EXCEEDED" });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("does not send a request without a Gemini key", async () => {
  vi.stubEnv("GEMINI_API_KEY", " ");
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  await expect(new GeminiProvider().generate({ messages })).rejects.toMatchObject({ code: "AI_NOT_CONFIGURED" });
  expect(fetcher).not.toHaveBeenCalled();
});
it.each([[403, "AI_AUTH_FAILED"], [404, "AI_MODEL_UNAVAILABLE"], [500, "AI_PROVIDER_FAILED"]])("sanitizes Google error %s", async (status, code) => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('private provider response', { status })));
  await expect(new GeminiProvider().generate({ messages })).rejects.toMatchObject({ code });
});
it("rejects empty model responses", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{}')));
  await expect(new GeminiProvider().generate({ messages })).rejects.toMatchObject({ code: "AI_EMPTY_RESPONSE" });
});
it("preserves an explicit Gemini model and supports switching back later", () => {
  vi.stubEnv("AI_DEFAULT_PROVIDER", "gemini");
  expect(getModelTarget("gemini-2.5-flash").model).toBe("gemini-2.5-flash");
  vi.stubEnv("AI_DEFAULT_PROVIDER", "openai");
  vi.stubEnv("AI_DEFAULT_MODEL", "gemini-2.5-flash-lite");
  expect(getModelTarget("gemini-2.5-flash")).toEqual({ provider: "openai", model: "gpt-5" });
});
