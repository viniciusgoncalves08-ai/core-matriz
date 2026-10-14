import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { FileError, MAX_FILE_BYTES } from "./file-extraction";
export const fileHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function fileResponse(operation: (userId: string) => Promise<unknown>) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Entre para acessar seus arquivos." }, { status: 401, headers: fileHeaders });
    const result = await operation(userId);
    return result instanceof Response ? result : NextResponse.json(result, { headers: fileHeaders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof FileError ? error.message : "Não foi possível concluir. Atualize a lista para conferir o resultado." }, { status: error instanceof FileError ? error.status : 500, headers: fileHeaders });
  }
}
export async function readFileBody(request: Request) {
  if (Number(request.headers.get("content-length")) > MAX_FILE_BYTES) throw new FileError("Envie arquivos de até 1 MB.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new FileError("Arquivo vazio.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_FILE_BYTES) { await reader.cancel(); throw new FileError("Envie arquivos de até 1 MB.", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, size);
}
