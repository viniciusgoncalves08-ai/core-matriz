import { AIError } from "@/ai/ai-error";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AgentUnavailableError, respondAsNexus } from "@/features/nexus/nexus-service";
import { getSessionUserId } from "@/lib/auth";

const bodySchema = z.object({
  agentId: z.string().min(1).max(100).optional(),
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
    if (error instanceof AIError) return NextResponse.json({ error: error.message, code: error.code }, { status: 503 });
    if (error instanceof AgentUnavailableError) return NextResponse.json({ error: error.message }, { status: 409 });
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.flatten() }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Não foi possível concluir a conversa. Tente novamente." },
      { status: 500 },
    );
  }
}
