import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { GoalManager } from "@/features/goals/goal-manager";
export default async function GoalsPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/entrar");
  const projects = await db.project.findMany({ where: { userId }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return <AppShell active="Objetivos" title="O que você quer alcançar?" description="Transforme intenções em objetivos e acompanhe sua evolução."><GoalManager projects={projects} /></AppShell>;
}
