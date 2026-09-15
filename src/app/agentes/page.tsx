import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { AgentHub } from "@/features/agents/agent-hub";
export default async function AgentsPage() {
  if (!await getSessionUserId()) redirect("/entrar");
  return <AppShell active="Agentes" title="Seus agentes" description="Defina especialistas e escolha com quem conversar."><AgentHub /></AppShell>;
}
