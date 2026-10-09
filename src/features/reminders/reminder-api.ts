import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { ReminderConflict, ReminderNotFound } from "./reminder-service";
import { ReminderTimeError } from "./reminder-schema";
export async function reminderResponse(operation: (userId: string) => Promise<unknown>) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Entre para consultar seus lembretes." }, { status: 401, headers });
    return NextResponse.json(await operation(userId), { headers });
  } catch (error) {
    const status = error instanceof ReminderNotFound ? 404 : error instanceof ReminderConflict ? 409 : error instanceof z.ZodError || error instanceof SyntaxError || error instanceof ReminderTimeError ? 400 : 500;
    const message = error instanceof ReminderTimeError ? error.message : status === 404 ? "Lembrete indisponível." : status === 409 ? "O lembrete mudou. Atualize a lista e revise novamente." : status === 400 ? "Confira os dados do lembrete." : "Não foi possível salvar. Atualize a lista para conferir o resultado.";
    return NextResponse.json({ error: message }, { status, headers });
  }
}
