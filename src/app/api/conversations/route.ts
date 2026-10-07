import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

const createSchema = z.object({ title: z.string().trim().max(120).optional() });

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401, headers });
    const params = new URL(request.url).searchParams;
    const input = z.object({ q: z.string().trim().max(120), page: z.coerce.number().int().min(1).max(10000) }).parse({ q: params.get("q") ?? "", page: params.get("page") ?? "1" });
    const where = { userId, ...(input.q ? { OR: [
      { title: { contains: input.q, mode: "insensitive" as const } },
      { messages: { some: { content: { contains: input.q, mode: "insensitive" as const } } } },
    ] } : {}) };
    const pageSize = 20;
    const [total, conversations] = await db.$transaction([
      db.conversation.count({ where }),
      db.conversation.findMany({ where, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], skip: (input.page - 1) * pageSize, take: pageSize,
        select: { id: true, title: true, createdAt: true, updatedAt: true } }),
    ], { isolationLevel: "RepeatableRead" });
    return NextResponse.json({ conversations, total, page: input.page, pageSize, hasMore: input.page * pageSize < total }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? "Confira o termo de busca e a página." : "Não foi possível carregar as conversas." }, { status: error instanceof z.ZodError ? 400 : 500, headers });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId();
    if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const input = createSchema.parse(await request.json());
    const conversation = await db.conversation.create({
      data: { userId, title: input.title ?? "Nova conversa" },
    });
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
