import { NextResponse } from "next/server";
import { z } from "zod";
import { respondAsNexus } from "@/features/nexus/nexus-service";
import { getSessionUserId } from "@/lib/auth";

const bodySchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().trim().min(1).max(12000),
});

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = bodySchema.parse(await request.json());
    const result = await respondAsNexus({ ...body, userId });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.flatten() }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 },
    );
  }
}
