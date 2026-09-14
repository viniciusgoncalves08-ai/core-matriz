import { notFound, redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { NexusChat } from "@/features/nexus/nexus-chat";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/entrar");
  const { id } = await params;
  const conversation = await db.conversation.findFirst({ where: { id, userId }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  if (!conversation) notFound();
  const messages = conversation.messages.filter(m => m.role === "user" || m.role === "assistant").map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
  return <AppShell active="Histórico" title={conversation.title ?? "Conversa com Nexus"} description="Continue a conversa com seu contexto anterior."><a href="/historico">← Todas as conversas</a><section className="nexus-card"><NexusChat key={id} initialConversationId={id} initialMessages={messages} /></section></AppShell>;
}
