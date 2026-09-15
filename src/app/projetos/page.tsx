import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { ProjectManager } from "@/features/projects/project-manager";
export default async function ProjectsPage() {
  if (!await getSessionUserId()) redirect("/entrar");
  return <AppShell active="Projetos" title="Da ideia à realização" description="Organize seus projetos e acompanhe cada próximo passo."><ProjectManager /></AppShell>;
}
