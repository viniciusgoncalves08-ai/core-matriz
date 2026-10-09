import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { NexusChat } from "@/features/nexus/nexus-chat";

export default async function NexusPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const { projectId } = await searchParams;
  let project: { id: string; name: string } | null = null;
  if (projectId) {
    const userId = await getSessionUserId(); if (!userId) redirect("/entrar");
    project = await db.project.findFirst({ where: { id: projectId, userId }, select: { id: true, name: true } });
    if (!project) notFound();
  }
  return (
    <AppShell active="Nexus" title="Nexus" description="Sua inteligência pessoal, conectada ao que importa.">
      <section className="nexus-card" id="nexus">
        <div className="nexus-top-links"><a href="/historico">Conversas</a><a href="/memoria">Memória</a><a href="/agentes">Agentes</a></div>
        <NexusChat key={project?.id ?? "general"} initialProject={project ?? undefined} />
      </section>
    </AppShell>
  );
}
