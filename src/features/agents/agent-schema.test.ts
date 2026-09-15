import { expect, it } from "vitest";
import { agentSchema, agentPatchSchema } from "./agent-schema";
it("pausing does not erase existing instructions or model settings", () => {
  expect(agentPatchSchema.parse({ status: "PAUSED" })).toEqual({ status: "PAUSED" });
});
it("discards client supplied owner and permissions", () => {
  expect(agentPatchSchema.parse({ name: "Planejador", userId: "other", permissions: { all: true } })).toEqual({ name: "Planejador" });
});
it("rejects blank instructions and invalid temperatures", () => {
  expect(agentSchema.safeParse({ name: "Agente", role: "Projetos", systemPrompt: "  " }).success).toBe(false);
  expect(agentPatchSchema.safeParse({ temperature: 3 }).success).toBe(false);
});
