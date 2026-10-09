import { RemindersPanel } from "@/features/reminders/reminders-panel";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { AlertsPanel } from "@/features/alerts/alerts-panel";
export default async function AlertsPage() {
  if (!await getSessionUserId()) redirect("/entrar");
  return <AppShell active="Alertas" title="O que pede atenção" description="Acompanhe prazos vencidos sem repetir os avisos que você já leu."><div className="workspace-stack"><RemindersPanel/><AlertsPanel/></div></AppShell>;
}
