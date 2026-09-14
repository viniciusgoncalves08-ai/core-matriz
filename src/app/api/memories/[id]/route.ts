import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { blockMemory, updateMemory } from "@/features/memory/memory-service";
import { db } from "@/lib/db";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("update"), content: z.string().trim().min(1).max(12000), summary: z.string().trim().max(500).optional(), reason: z.string().trim().max(300).optional() }),
  z.object({ action: z.literal("block") }),
]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const { id } = await context.params;
    const input = patchSchema.parse(await request.json());
    const memory = input.action === "block"
      ? await blockMemory(userId, id)
      : await updateMemory({ userId, memoryId: id, content: input.content, summary: input.summary, reason: input.reason });
    return NextResponse.json({ memory });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro interno" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await context.params;
  const memory = await db.memory.findFirst({ where: { id, userId } });
  if (!memory) return NextResponse.json({ error: "Memória não encontrada" }, { status: 404 });

  await db.memoryVersion.create({
    data: { memoryId: id, content: memory.content, summary: memory.summary, status: memory.status, reason: "Exclusão solicitada pelo usuário" },
  });
  await db.memory.update({ where: { id }, data: { status: "DELETED", validUntil: new Date() } });
  return NextResponse.json({ ok: true });
}
