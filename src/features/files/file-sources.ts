export type FileSource = { id: string; name: string; page: number };
export function fileSources(metadata: unknown): FileSource[] {
  if (!metadata || typeof metadata !== "object" || !("retrieval" in metadata)) return [];
  const retrieval = metadata.retrieval;
  if (!retrieval || typeof retrieval !== "object" || !("fileSources" in retrieval) || !Array.isArray(retrieval.fileSources)) return [];
  return retrieval.fileSources.filter((item): item is FileSource => Boolean(item) && typeof item.id === "string" && typeof item.name === "string" && Number.isInteger(item.page) && item.page > 0).slice(0, 8);
}
