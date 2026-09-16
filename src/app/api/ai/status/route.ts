import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { getModelTarget } from "@/ai/model-target";

export const maxDuration = 30;
const headers = { "Cache-Control": "private, no-store" };

// Read-only diagnosis. Never return environment values, keys or provider errors.
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401, headers });
  try {
    const agent = await db.agent.findFirst({ where: { userId, slug: "nexus" }, select: { preferredModel: true } });
    const target = getModelTarget(agent?.preferredModel);
    const safeModel = (name: string) => /^(gemini-|gpt-|chatgpt-|o[134](?:-|$))[a-zA-Z0-9._-]*$/.test(name) && name.length <= 120 ? name : "invalid";
    const result = {
      provider: ["gemini", "openai"].includes(target.provider) ? target.provider : "invalid", model: safeModel(target.model),
      geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      openaiKeyConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
      agentModelConfigured: Boolean(agent?.preferredModel?.trim()),
      providerExplicit: Boolean(process.env.AI_DEFAULT_PROVIDER?.trim()),
      defaultModelExplicit: Boolean(process.env.AI_DEFAULT_MODEL?.trim()),
    };
    if (target.provider !== "gemini" || !process.env.GEMINI_API_KEY?.trim()) return NextResponse.json(result, { headers });
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", {
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY.trim() }, cache: "no-store", signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return NextResponse.json({ ...result, catalogStatus: response.status }, { headers });
    const data = await response.json() as { models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>; nextPageToken?: string };
    const models = (data.models ?? []).filter(m => m.supportedGenerationMethods?.includes("generateContent")).map(m => m.name?.replace(/^models\//, "")).filter((name): name is string => Boolean(name && /^gemini-[a-zA-Z0-9._-]+$/.test(name))).slice(0, 1000);
    return NextResponse.json({ ...result, catalogStatus: 200, modelListed: models.includes(target.model), catalogComplete: !data.nextPageToken, models }, { headers });
  } catch {
    return NextResponse.json({ error: "Não foi possível verificar a conexão agora." }, { status: 503, headers });
  }
}
