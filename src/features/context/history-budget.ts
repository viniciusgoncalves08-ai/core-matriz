type HistoryMessage = { role: "user" | "assistant"; content: string };

/** Keep complete, recent messages within a serialized-character budget. */
export function limitHistory(messages: HistoryMessage[], budget = 16000): HistoryMessage[] {
  const result: HistoryMessage[] = [];
  for (const message of [...messages].reverse()) {
    if (JSON.stringify([message, ...result]).length > budget) break;
    result.unshift(message);
  }
  // An orphan answer can refer to a question no longer present in the context.
  while (result[0]?.role === "assistant") result.shift();
  return result;
}
