import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthConfigurationError, createSession, validateAuthConfiguration } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  let stage = "validation";
  try {
    const input = schema.parse(await request.json());
    validateAuthConfiguration();
    stage = "database";
    const email = input.email.toLowerCase();
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });

    const user = await db.user.create({
      data: {
        name: input.name,
        email,
        passwordHash: await hash(input.password, 12),
        agents: {
          create: {
            name: "Nexus",
            slug: "nexus",
            role: "Orquestrador central do Core Matriz",
            systemPrompt: "Seja direto, analítico, crítico, profissional e honesto. Nunca represente ação não executada como concluída.",
            preferredModel: process.env.AI_DEFAULT_MODEL ?? "gpt-5",
          },
        },
      },
    });

    stage = "session";
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dados inválidos", details: error.flatten() }, { status: 400 });
    }
    const code = error instanceof AuthConfigurationError
      ? "AUTH_CONFIG_MISSING"
      : stage === "session" ? "AUTH_SESSION_FAILED"
      : stage === "database" ? "AUTH_DATABASE_FAILED" : "AUTH_REQUEST_FAILED";
    // Never log request bodies, passwords, tokens or raw database errors.
    console.error("Authentication failed", { code, stage, errorType: error instanceof Error ? error.name : "Unknown" });
    return NextResponse.json({ error: "Não foi possível entrar agora. Tente novamente em instantes.", code }, { status: 500 });
  }
}
