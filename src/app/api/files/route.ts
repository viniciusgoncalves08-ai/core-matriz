import { FileError, validateFile } from "@/features/files/file-extraction";
import { fileResponse, readFileBody } from "@/features/files/file-api";
import { listFiles, requireFileConversation, uploadFile } from "@/features/files/file-service";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  return fileResponse(async userId => {
    const query = new URL(request.url).searchParams;
    return { files: await listFiles(userId, { conversationId: query.get("conversationId") || undefined, projectId: query.get("projectId") || undefined }) };
  });
}
export async function POST(request: Request) {
  return fileResponse(async userId => {
    const conversationId = new URL(request.url).searchParams.get("conversationId");
    if (!conversationId || conversationId.length > 150) throw new FileError("Informe a conversa.");
    await requireFileConversation(userId, conversationId);
    let name: string;
    try { name = decodeURIComponent(request.headers.get("x-file-name") ?? ""); } catch { throw new FileError("Nome de arquivo inválido."); }
    validateFile(name, 1);
    const bytes = await readFileBody(request);
    return { file: await uploadFile(userId, conversationId, name, bytes) };
  });
}
