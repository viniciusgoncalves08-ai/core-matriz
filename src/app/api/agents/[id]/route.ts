import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { agentPatchSchema } from "@/features/agents/agent-schema";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    const { id } = await params;
    const input = agentPatchSchema.parse(await request.json());
    const agent = await db.$transaction(async tx => {
      const current = await tx.agent.findFirst({ where: { id, userId } });
      if (!current) return null;
      const updated = await tx.agent.update({ where: { id }, data: input });
      await tx.auditLog.create({ data: { userId, action: "AGENT_UPDATED", entityType: "agent", entityId: id, metadata: { fields: Object.keys(input) } } });
      return updated;
    });
    if (!agent) return NextResponse.json({ error: "Agente não encontrado." }, { status: 404 });
    return NextResponse.json({ agent });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? "Confira os dados do agente." : "Não foi possível atualizar o agente." }, { status: error instanceof z.ZodError ? 400 : 500 });
  }
}
