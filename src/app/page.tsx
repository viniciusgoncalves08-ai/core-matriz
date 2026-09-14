import { AppShell } from "@/components/app-shell";
import { NexusChat } from "@/features/nexus/nexus-chat";

const modules = [
  ["Hoje", "Seu foco operacional e próximos compromissos."],
  ["Memória", "Informações estruturadas que o Nexus pode recuperar."],
  ["Projetos", "Iniciativas, decisões, tarefas e contexto relacionado."],
  ["Agentes", "Especialistas coordenados pelo Nexus quando necessário."],
];

export default function HomePage() {
  return (
    <AppShell active="Home" title="Seu espaço, conectado." description="Organize contexto, decisões e execução com o Nexus.">
      <section className="nexus-card" id="nexus">
        <div className="orb">N</div><div className="nexus-copy"><span>NEXUS</span><h2>O que precisa da sua atenção agora?</h2><p>Converse naturalmente. Suas memórias relevantes ajudam a orientar cada resposta.</p></div>
        <div className="actions"><a href="/historico">Ver conversas anteriores</a><a href="/memoria">Gerenciar memórias</a><a href="/entrar">Entrar / criar conta</a></div>
        <NexusChat />
      </section>
      <div className="grid">{modules.map(([title, description]) => <article key={title}><span className="line"/><h3>{title}</h3><p>{description}</p><small>{title === "Memória" ? "Disponível no menu" : "Em desenvolvimento"}</small></article>)}</div>
    </AppShell>
  );
}
