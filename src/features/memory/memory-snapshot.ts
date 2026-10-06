// Inventory responses remain visible in history, but must not reintroduce stale
// memory into model context after the source is corrected, blocked or expires.
export function isMemorySnapshot(metadata: unknown): boolean {
  return typeof metadata === "object" && metadata !== null && "kind" in metadata && metadata.kind === "memory_query";
}
