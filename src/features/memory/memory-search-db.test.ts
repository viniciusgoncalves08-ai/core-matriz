import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { listMemories, setMemoryStatus } from "./memory-service";
describe.skipIf(process.env.ACTION_DB_TESTS !== "true")("memory search with isolated Postgres", () => {
  let userId: string;
  let otherId: string;
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/core_matriz") throw new Error("Only isolated CI database allowed");
    userId = (await db.user.create({ data: { email: `search-${crypto.randomUUID()}@example.invalid` } })).id;
    otherId = (await db.user.create({ data: { email: `other-${crypto.randomUUID()}@example.invalid` } })).id;
    await db.memory.createMany({ data: [
      ...Array.from({ length: 22 }, (_, i) => ({ userId, classification: "CONTEXT" as const, content: `Registro ${i}` })),
      { userId, classification: "PREFERENCE", content: "Leitura diária", status: "BLOCKED" },
      { userId, classification: "FACT", content: "Outro conteúdo", summary: "Leitura", source: "Livro" },
      { userId, classification: "DECISION", content: "Outro registro", source: "Leitura" },
      { userId, classification: "FACT", content: "Leitura excluída", status: "DELETED" },
      { userId: otherId, classification: "FACT", content: "Leitura privada" },
    ] });
  });
  afterAll(async () => { for (const id of [userId, otherId]) if (id) await db.user.delete({ where: { id } }); await db.$disconnect(); });
  it("searches content, summary and source without leaking deleted or other users' records", async () => {
    const result = await listMemories(userId, { q: "LEITURA" });
    expect(result.total).toBe(3);
    expect(result.memories.every(memory => memory.userId === userId && memory.status !== "DELETED")).toBe(true);
    const filtered = await listMemories(userId, { q: "leitura", classification: "PREFERENCE", status: "BLOCKED" });
    expect(filtered.total).toBe(1); expect(filtered.memories[0].content).toBe("Leitura diária");
  });
  it("paginates without duplicates and reflects removal from the filtered set", async () => {
    const first = await listMemories(userId, { q: "Registro" });
    const second = await listMemories(userId, { q: "Registro", page: 2 });
    expect(first.total).toBe(23); expect(first.memories).toHaveLength(20); expect(first.hasMore).toBe(true);
    expect(second.memories).toHaveLength(3); expect(second.hasMore).toBe(false);
    expect(new Set([...first.memories, ...second.memories].map(memory => memory.id)).size).toBe(23);
    const id = first.memories[0].id;
    await setMemoryStatus(userId, id, "DELETED");
    const after = await listMemories(userId, { q: "Registro" });
    expect(after.total).toBe(22); expect(after.memories.some(memory => memory.id === id)).toBe(false);
  });
});
