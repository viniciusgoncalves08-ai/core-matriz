import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { getProjectLink, changeProjectLink, ProjectLinkNotFound, ProjectLinkConflict } from "@/features/project-context/project-link-service";
async function respond(operation: (userId: string) => Promise<unknown>) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Entre para organizar seus projetos." }, { status: 401, headers });
    return NextResponse.json(await operation(userId), { headers });
  } catch (error) {
    const status = error instanceof ProjectLinkNotFound ? 404 : error instanceof ProjectLinkConflict ? 409 : error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 500;
    return NextResponse.json({ error: status === 404 ? "Registro ou projeto indisponível." : status === 409 ? "O vínculo mudou. Recarregue a página antes de salvar novamente." : status === 400 ? "Confira os dados do vínculo." : "Não foi possível salvar o vínculo. Recarregue para conferir." }, { status, headers });
  }
}
export async function GET(request: Request) { return respond(userId => getProjectLink(userId, Object.fromEntries(new URL(request.url).searchParams))); }
export async function PATCH(request: Request) { return respond(async userId => changeProjectLink(userId, await request.json())); }
