import { fileHeaders, fileResponse } from "@/features/files/file-api";
import { deleteFile, getFile } from "@/features/files/file-service";
export const runtime = "nodejs";
type Params = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Params) {
  return fileResponse(async userId => {
    const download = new URL(request.url).searchParams.get("download") === "1";
    const file = await getFile(userId, (await params).id, download);
    if (!download) return { file };
    return new Response(new Uint8Array(file.bytes!), { headers: { ...fileHeaders, "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="arquivo"; filename*=UTF-8''${encodeURIComponent(file.name).replace(/'/g, "%27")}` } });
  });
}
export async function DELETE(_request: Request, { params }: Params) {
  return fileResponse(async userId => deleteFile(userId, (await params).id));
}
