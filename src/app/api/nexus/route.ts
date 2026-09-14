import { NextResponse } from "next/server";
import { z } from "zod";
import { respondAsNexus } from "@/features/nexus/nexus-service";

const bodySchema = z.object({
  userId: z.string().min(1),
  conversationId: z.string().min(1),
  message: z.string().trim().min(1).max(12000),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const result = await respondAsNexus(body);
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
