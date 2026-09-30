import { AppShell } from "@/components/app-shell";
import { NexusChat } from "@/features/nexus/nexus-chat";

export default function NexusPage() {
  return (
    <AppShell active="Nexus" title="Nexus" description="Sua inteligência pessoal, conectada ao que importa.">
      <section className="nexus-card" id="nexus">
        <div className="nexus-top-links"><a href="/historico">Conversas</a><a href="/memoria">Memória</a><a href="/agentes">Agentes</a></div>
        <NexusChat />
      </section>
    </AppShell>
  );
}
