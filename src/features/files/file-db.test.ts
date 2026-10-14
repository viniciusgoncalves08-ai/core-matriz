import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { uploadFile, listFiles, getFile, deleteFile, fileContext } from "./file-service";
import { globalSearch } from "@/features/search/search-service";
import { buildContext, serializeContext } from "@/features/context/context-engine";
import { pdfFixture } from "./pdf-fixture";
describe.skipIf(process.env.ACTION_DB_TESTS !== "true")("private attachments in isolated Postgres", () => {
  let owner: string, other: string, conversationId: string, linkedId: string, projectId: string, fileId: string;
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (!["localhost", "127.0.0.1"].includes(url.hostname) || url.pathname !== "/core_matriz") throw new Error("Only isolated CI database allowed");
    owner = (await db.user.create({ data: { email: `files-${crypto.randomUUID()}@example.invalid` } })).id;
    other = (await db.user.create({ data: { email: `files-other-${crypto.randomUUID()}@example.invalid` } })).id;
    projectId = (await db.project.create({ data: { userId: owner, name: "Documentos" } })).id;
    conversationId = (await db.conversation.create({ data: { userId: owner, projectId } })).id;
    linkedId = (await db.conversation.create({ data: { userId: owner, projectId } })).id;
  });
  afterAll(async () => { for (const id of [owner, other]) if (id) await db.user.delete({ where: { id } }); await db.$disconnect(); });
  it("persists PDF original and text, deduplicates simultaneous uploads, audits once", async () => {
    const bytes = pdfFixture("Fornecedor prazo dezembro");
    const rows = await Promise.all([uploadFile(owner, conversationId, "fonte.pdf", bytes), uploadFile(owner, conversationId, "fonte.pdf", bytes)]);
    expect(rows[0].id).toBe(rows[1].id); fileId = rows[0].id;
    const file = await getFile(owner, fileId, true);
    expect(Buffer.from(file.bytes!)).toEqual(bytes); expect(file.text).toContain("Fornecedor");
    expect(await db.auditLog.count({ where: { userId: owner, action: "FILE_UPLOADED" } })).toBe(1);
  });
  it("denies all cross-account operations and does not expose original bytes in lists", async () => {
    await expect(getFile(other, fileId, true)).rejects.toThrow("indisponível");
    await expect(deleteFile(other, fileId)).rejects.toThrow("indisponível");
    await expect(listFiles(other, { conversationId })).rejects.toThrow("indisponível");
    await expect(uploadFile(other, conversationId, "f.txt", Buffer.from("secret"))).rejects.toThrow("indisponível");
    expect((await listFiles(owner, { conversationId }))[0]).not.toHaveProperty("bytes");
    expect(await fileContext(other, conversationId, ["fornecedor"], projectId)).toEqual([]);
  });
  it("connects project conversations and search with owned page references", async () => {
    const context = await buildContext(owner, "Qual o prazo do fornecedor?", { conversationId: linkedId, projectId });
    expect(context.files?.[0]).toMatchObject({ id: fileId, page: 1, href: `/arquivos/${fileId}#pagina-1` });
    expect(serializeContext(context)).toContain("Fornecedor prazo dezembro");
    expect((await globalSearch(owner, { q: "fornecedor", kind: "files" })).results[0].id).toBe(fileId);
    expect((await globalSearch(other, { q: "fornecedor", kind: "files" })).results).toEqual([]);
    await db.conversation.update({ where: { id: conversationId }, data: { projectId: null } });
    expect(await fileContext(owner, linkedId, ["fornecedor"], projectId)).toEqual([]);
    expect((await fileContext(owner, conversationId, ["fornecedor"])).length).toBe(1);
  });
  it("deletes original and extracted text from future retrieval and search", async () => {
    await deleteFile(owner, fileId);
    await expect(getFile(owner, fileId)).rejects.toThrow("indisponível");
    expect(await fileContext(owner, conversationId, ["fornecedor"])).toEqual([]);
    expect((await globalSearch(owner, { q: "fornecedor", kind: "files" })).results).toEqual([]);
    expect(await db.auditLog.count({ where: { userId: owner, action: "FILE_DELETED" } })).toBe(1);
  });
  it("serializes concurrent uploads at the per-conversation quota", async () => {
    for (let i = 0; i < 4; i++) await uploadFile(owner, conversationId, `${i}.txt`, Buffer.from(`texto ${i}`));
    const results = await Promise.allSettled([uploadFile(owner, conversationId, "a.txt", Buffer.from("texto a")), uploadFile(owner, conversationId, "b.txt", Buffer.from("texto b"))]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.attachment.count({ where: { userId: owner, conversationId } })).toBe(5);
  });
});
