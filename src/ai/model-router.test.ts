import { expect, it, vi } from "vitest";
import { ModelRouter } from "./model-router";
import { AIError } from "./ai-error";
it("tries the next model after a failure", async () => {
  const generate = vi.fn().mockRejectedValueOnce(new AIError("AI_MODEL_UNAVAILABLE")).mockResolvedValueOnce({ text: "OK", model: "backup", provider: "test" });
  const router = new ModelRouter([{ name: "test", healthCheck: async () => true, generate }]);
  expect((await router.generate({ messages: [] }, [{ provider: "test", model: "first" }, { provider: "test", model: "backup" }])).model).toBe("backup");
});
it("never exposes raw provider errors", async () => {
  const router = new ModelRouter([{ name: "test", healthCheck: async () => true, generate: async () => { throw new Error("private-debug-payload"); } }]);
  await expect(router.generate({ messages: [] }, [{ provider: "test" }])).rejects.toMatchObject({ code: "AI_PROVIDER_FAILED" });
});
