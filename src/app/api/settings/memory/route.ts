import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { getMemorySettings, saveMemorySettings } from "@/features/settings/memory-settings-service";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Entre na sua conta para configurar a memória." }, { status: 401, headers });
    return NextResponse.json(await getMemorySettings(userId), { headers });
  } catch { return NextResponse.json({ error: "Não foi possível carregar a configuração." }, { status: 500, headers }); }
}
export async function PATCH(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Entre na sua conta para configurar a memória." }, { status: 401, headers });
    return NextResponse.json(await saveMemorySettings(userId, await request.json()), { headers });
  } catch (error) {
    return NextResponse.json({ error: "Não foi possível salvar a configuração." }, { status: error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 500, headers });
  }
}
