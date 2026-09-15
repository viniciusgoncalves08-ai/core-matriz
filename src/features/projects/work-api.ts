import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { WorkNotFoundError } from "./work-service";
export async function workResponse(action: (userId: string) => Promise<unknown>, status = 200) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
  try { return NextResponse.json(await action(userId), { status }); }
  catch (error) {
    if (error instanceof WorkNotFoundError) return NextResponse.json({ error: "Projeto ou tarefa não encontrado." }, { status: 404 });
    if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ error: "Confira os campos: nome, situação, prioridade e prazo devem ser válidos." }, { status: 400 });
    return NextResponse.json({ error: "Não foi possível concluir a operação. Tente novamente." }, { status: 500 });
  }
}
