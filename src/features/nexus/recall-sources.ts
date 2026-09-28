export function recallSources(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object") return [];
  const retrieval = (metadata as { retrieval?: unknown }).retrieval;
  if (!retrieval || typeof retrieval !== "object") return [];
  const ids = (retrieval as { conversationIds?: unknown }).conversationIds;
  return Array.isArray(ids) ? [...new Set(ids.filter((id): id is string => typeof id === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(id)))].slice(0, 6) : [];
}
