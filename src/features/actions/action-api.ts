import { ReminderTimeError } from "@/features/reminders/reminder-schema";
import { ReminderConflict, ReminderNotFound } from "@/features/reminders/reminder-service";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { ActionNotFoundError, ActionConflictError } from "./action-service";
export async function actionResponse(operation: (userId: string) => Promise<unknown>) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Entre novamente para acessar esta ação." }, { status: 401, headers });
    return NextResponse.json(await operation(userId), { headers });
  } catch (error) {
    const status = error instanceof ActionNotFoundError || error instanceof ReminderNotFound ? 404 : error instanceof ActionConflictError || error instanceof ReminderConflict ? 409 : error instanceof z.ZodError || error instanceof SyntaxError || error instanceof ReminderTimeError ? 400 : 500;
    return NextResponse.json({ error: error instanceof ReminderTimeError ? error.message : status === 404 ? "Ação não encontrada." : status === 409 ? "O registro mudou desde a proposta. Envie um novo pedido de edição para revisar os dados atuais." : status === 400 ? "Confira os dados da proposta." : "Não foi possível concluir. Atualize as ações para conferir o resultado antes de tentar novamente." }, { status, headers });
  }
}
