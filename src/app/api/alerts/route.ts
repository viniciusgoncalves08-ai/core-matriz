import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserId } from "@/lib/auth";
import { getDeadlineAlerts, markDeadlineAlertRead } from "@/features/alerts/alert-service";
const headers = { "Cache-Control":"private, no-store" };
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({error:"Entre para consultar seus alertas."},{status:401,headers});
  try { return NextResponse.json(await getDeadlineAlerts(userId),{headers}); }
  catch { return NextResponse.json({error:"Não foi possível consultar os alertas."},{status:500,headers}); }
}
export async function PATCH(request:Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({error:"Entre para atualizar seus alertas."},{status:401,headers});
  try {
    const found = await markDeadlineAlertRead(userId,await request.json());
    return NextResponse.json(found?{ok:true}:{error:"Este alerta mudou ou não está mais disponível. Atualize a lista."},{status:found?200:404,headers});
  } catch(error) { return NextResponse.json({error:"Não foi possível marcar o alerta como lido."},{status:error instanceof z.ZodError||error instanceof SyntaxError?400:500,headers}); }
}
