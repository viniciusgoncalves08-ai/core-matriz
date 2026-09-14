import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await context.params;
  const conversation = await db.conversation.findFirst({
    where: { id, userId },
    select: {
      id: true,
      title: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, metadata: true, createdAt: true },
      },
    },
  });

  if (!conversation) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
  return NextResponse.json({ conversation, messages: conversation.messages });
}
