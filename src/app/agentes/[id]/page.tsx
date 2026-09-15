import { notFound, redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { NexusChat } from "@/features/nexus/nexus-chat";
export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/entrar");
  const { id } = await params;
  const agent = await db.agent.findFirst({ where: { id, userId } });
  if (!agent) notFound();
  return <AppShell active="Agentes" title={agent.name} description={agent.description || agent.role}>
    <p><a href="/agentes">← Todos os agentes</a></p>
    {agent.status === "ACTIVE" ? <section className="nexus-card"><NexusChat agentId={id} agentName={agent.name} /></section> : <p className="panel">Este agente está pausado ou desativado. Ative-o no Agent Hub para conversar.</p>}
  </AppShell>;
}
