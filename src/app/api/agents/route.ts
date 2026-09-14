import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(80),
  description: z.string().trim().max(500).optional(),
  role: z.string().trim().min(2).max(300),
  systemPrompt: z.string().trim().min(1).max(20000),
  preferredModel: z.string().trim().max(120).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const agents = await db.agent.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ agents });
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const input = createSchema.parse(await request.json());
    const agent = await db.agent.create({ data: { ...input, userId } });
    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro interno" }, { status: 400 });
  }
}
