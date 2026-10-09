// Inventory responses remain visible in history, but must not reintroduce stale
// memory or reminders into model context after records change, are blocked or expire.
export function isMemorySnapshot(metadata: unknown): boolean {
  return typeof metadata === "object" && metadata !== null && "kind" in metadata && (metadata.kind === "memory_query" || metadata.kind === "reminder_query");
}
