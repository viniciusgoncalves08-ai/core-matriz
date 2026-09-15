import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { agentSchema } from "@/features/agents/agent-schema";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    const agents = await db.agent.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
    return NextResponse.json({ agents });
  } catch { return NextResponse.json({ error: "Não foi possível carregar os agentes." }, { status: 500 }); }
}
export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    const input = agentSchema.parse(await request.json());
    const agent = await db.$transaction(async tx => {
      const created = await tx.agent.create({ data: { ...input, userId, slug: `agent-${randomUUID()}` } });
      await tx.auditLog.create({ data: { userId, action: "AGENT_CREATED", entityType: "agent", entityId: created.id } });
      return created;
    });
    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? "Confira os dados do agente." : "Não foi possível criar o agente." }, { status: error instanceof z.ZodError ? 400 : 500 });
  }
}
