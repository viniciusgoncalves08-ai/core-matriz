import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthConfigurationError, createSession, validateAuthConfiguration } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  let stage = "validation";
  try {
    const { email, password } = schema.parse(await request.json());
    stage = "database";
    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });

    stage = "password";
    if (!user?.passwordHash || !(await compare(password, user.passwordHash))) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    stage = "session";
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
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
