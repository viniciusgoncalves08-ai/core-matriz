import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { TaskManager } from "@/features/projects/task-manager";
import { projectStatuses } from "@/features/projects/work-labels";
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/entrar");
  const project = await db.project.findFirst({ where: { id: (await params).id, userId }, select: { id: true, name: true, description: true, status: true } });
  if (!project) notFound();
  return <AppShell active="Projetos" title={project.name} description="Divida seu objetivo em passos que você pode acompanhar." status={projectStatuses[project.status]}><div className="workspace-stack"><Link href="/projetos">← Voltar aos projetos</Link>{project.description && <p className="panel preserve-text">{project.description}</p>}<TaskManager projects={[{ id: project.id, name: project.name }]} projectId={project.id} /></div></AppShell>;
}
