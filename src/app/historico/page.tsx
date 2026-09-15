import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { ConversationHistory } from "@/features/history/conversation-history";

export default async function HistoryPage() {
  if (!await getSessionUserId()) redirect("/entrar");
  return <AppShell active="Histórico" title="Suas conversas" description="Retome uma conversa com o Nexus de onde parou."><div className="workspace-stack"><div className="actions"><span className="tag">Conversas</span><Link className="button-link" href="/atividade">Atividade do Core</Link></div><ConversationHistory /></div></AppShell>;
}
