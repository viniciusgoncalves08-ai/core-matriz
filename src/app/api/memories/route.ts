import { NextResponse } from "next/server";
import { z } from "zod";
import { MemoryClassification } from "@prisma/client";
import { getSessionUserId } from "@/lib/auth";
import { createMemory, listMemories } from "@/features/memory/memory-service";

const createSchema = z.object({
  content: z.string().trim().min(1).max(12000),
  summary: z.string().trim().max(500).optional(),
  classification: z.nativeEnum(MemoryClassification),
  source: z.string().trim().max(200).optional(),
  importance: z.number().min(0).max(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  return NextResponse.json({ memories: await listMemories(userId) });
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const input = createSchema.parse(await request.json());
    const memory = await createMemory({ ...input, userId });
    return NextResponse.json({ memory }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos", details: error.flatten() }, { status: 400 });
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
