import { expect, it } from "vitest";
import { limitHistory } from "./history-budget";
it("retains recent complete exchanges without mutating persisted messages", () => {
  const messages = [{ role: "user" as const, content: "a".repeat(20000) }, { role: "assistant" as const, content: "old answer" }, { role: "user" as const, content: "question" }, { role: "assistant" as const, content: "answer" }];
  const result = limitHistory(messages);
  expect(result).toEqual(messages.slice(2)); expect(messages).toHaveLength(4);
  expect(JSON.stringify(result).length).toBeLessThanOrEqual(16000);
});
it("does not include a partial oversized answer or disconnected older messages", () => {
  expect(limitHistory([{ role: "user", content: "older" }, { role: "assistant", content: "x".repeat(20000) }])).toEqual([]);
});
