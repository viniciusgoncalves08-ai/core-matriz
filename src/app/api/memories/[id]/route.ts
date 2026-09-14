import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { setMemoryStatus, updateMemory } from "@/features/memory/memory-service";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("update"), content: z.string().trim().min(1).max(12000), summary: z.string().trim().max(500).optional(), reason: z.string().trim().max(300).optional() }),
  z.object({ action: z.literal("block") }),
  z.object({ action: z.literal("unblock") }),
]);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const { id } = await context.params;
    const input = patchSchema.parse(await request.json());
    const memory = input.action === "update"
      ? await updateMemory({ userId, memoryId: id, content: input.content, summary: input.summary, reason: input.reason })
      : await setMemoryStatus(userId, id, input.action === "block" ? "BLOCKED" : "ACTIVE");
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
  try {
    await setMemoryStatus(userId, id, "DELETED");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir a memória" }, { status: 400 });
  }
}
