import { AppShell } from "@/components/app-shell";
import { NexusChat } from "@/features/nexus/nexus-chat";

export default function NexusPage() {
  return (
    <AppShell active="Nexus" title="Converse com o Nexus" description="Inicie uma conversa ou retome seu histórico.">
      <section className="nexus-card" id="nexus">
        <div className="orb">N</div><div className="nexus-copy"><span>NEXUS</span><h2>O que precisa da sua atenção agora?</h2><p>Converse naturalmente. Suas memórias relevantes ajudam a orientar cada resposta.</p></div>
        <div className="actions"><a href="/historico">Ver conversas anteriores</a><a href="/memoria">Gerenciar memórias</a><a href="/agentes">Meus agentes</a><a href="/entrar">Entrar / criar conta</a></div>
        <NexusChat />
      </section>
    </AppShell>
  );
}
