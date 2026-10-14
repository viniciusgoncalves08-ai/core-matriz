import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { excerptAroundMatch } from "@/features/context/conversation-recall";
import { extractFile, FileError, type FilePage } from "./file-extraction";
const summary = { id: true, name: true, size: true, pageCount: true, createdAt: true, conversationId: true } as const;
export async function requireFileConversation(userId: string, conversationId: string) {
  const row = await db.conversation.findFirst({ where: { id: conversationId, userId }, select: { id: true } });
  if (!row) throw new FileError("Conversa indisponível.", 404);
}
export async function uploadFile(userId: string, conversationId: string, name: string, bytes: Uint8Array) {
  await requireFileConversation(userId, conversationId);
  const extracted = await extractFile(name, bytes);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return db.$transaction(async tx => {
    // Serialize quotas and deduplication for concurrent uploads by the same account.
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    if (!await tx.conversation.findFirst({ where: { id: conversationId, userId }, select: { id: true } })) throw new FileError("Conversa indisponível.", 404);
    const existing = await tx.attachment.findUnique({ where: { userId_conversationId_sha256: { userId, conversationId, sha256 } }, select: summary });
    if (existing) return existing;
    if (await tx.attachment.count({ where: { userId } }) >= 20) throw new FileError("Limite de 20 arquivos por conta. Exclua um anexo para continuar.", 409);
    if (await tx.attachment.count({ where: { userId, conversationId } }) >= 5) throw new FileError("Limite de 5 arquivos por conversa.", 409);
    const file = await tx.attachment.create({ data: { userId, conversationId, sha256, size: bytes.length, bytes: new Uint8Array(bytes), ...extracted }, select: summary });
    await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    await tx.auditLog.create({ data: { userId, action: "FILE_UPLOADED", entityType: "attachment", entityId: file.id, metadata: { conversationId, size: bytes.length } } });
    return file;
  });
}
export async function listFiles(userId: string, scope: { conversationId?: string; projectId?: string }) {
  if (scope.conversationId) await requireFileConversation(userId, scope.conversationId);
  else if (!scope.projectId || !await db.project.findFirst({ where: { id: scope.projectId, userId }, select: { id: true } })) throw new FileError("Projeto indisponível.", 404);
  return db.attachment.findMany({ where: { userId, ...(scope.conversationId ? { conversationId: scope.conversationId } : { conversation: { userId, projectId: scope.projectId } }) }, select: summary, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 20 });
}
export async function getFile(userId: string, id: string, download = false) {
  const file = await db.attachment.findFirst({ where: { id, userId, conversation: { userId } }, select: { ...summary, text: true, pages: true, mime: true, ...(download ? { bytes: true } : {}) } });
  if (!file) throw new FileError("Arquivo indisponível ou excluído.", 404);
  return file;
}
export async function deleteFile(userId: string, id: string) {
  return db.$transaction(async tx => {
    const removed = await tx.attachment.deleteMany({ where: { id, userId } });
    if (!removed.count) throw new FileError("Arquivo indisponível ou excluído.", 404);
    await tx.auditLog.create({ data: { userId, action: "FILE_DELETED", entityType: "attachment", entityId: id } });
    return { deleted: true };
  });
}
export type FileExcerpt = { id: string; name: string; page: number; content: string; href: string };
export async function fileContext(userId: string, conversationId: string, terms: string[], projectId?: string | null): Promise<FileExcerpt[]> {
  const rows = await db.attachment.findMany({
    where: { userId, conversation: { userId }, OR: [{ conversationId }, ...(projectId ? [{ conversation: { userId, projectId } }] : [])] },
    select: { id: true, name: true, pages: true, conversationId: true }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 20,
  });
  return rows.flatMap(row => (row.pages as FilePage[]).filter(p => p.text.trim()).map(p => ({
    excerpt: { id: row.id, name: row.name, page: p.page, content: excerptAroundMatch(p.text, terms, 850), href: `/arquivos/${encodeURIComponent(row.id)}#pagina-${p.page}` },
    score: terms.filter(t => row.name.toLocaleLowerCase("pt-BR").replace(/[^\p{L}\p{N}]/gu, "").includes(t)).length * 10 + terms.filter(t => p.text.toLocaleLowerCase("pt-BR").includes(t)).length,
    current: row.conversationId === conversationId,
  }))).sort((a, b) => b.score - a.score || Number(b.current) - Number(a.current) || a.excerpt.page - b.excerpt.page).slice(0, 8).map(row => row.excerpt);
}
