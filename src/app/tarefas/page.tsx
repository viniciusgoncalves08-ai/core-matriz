import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { TaskManager } from "@/features/projects/task-manager";
export default async function TasksPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/entrar");
  const projects = await db.project.findMany({ where: { userId }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return <AppShell active="Tarefas" title="Seu próximo passo" description="Priorize, organize e conclua suas tarefas, com ou sem projeto."><TaskManager projects={projects} /></AppShell>;
}
