import { Suspense } from "react";
import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import { HomeOverview } from "@/features/home/home-overview";
import { AppShell } from "@/components/app-shell";

const modules = [
  ["Tarefas", "Prioridades, prazos e próximos passos.", "/tarefas"],
  ["Memória", "Informações estruturadas que o Nexus pode recuperar.", "/memoria"],
  ["Projetos", "Da ideia à execução, com tarefas e progresso.", "/projetos"],
  ["Agentes", "Especialistas que você configura e escolhe para conversar.", "/agentes"],
];

export default async function HomePage() {
  const userId = await getSessionUserId();
  return (
    <AppShell active="Home" title="Seu espaço, conectado." description="Acompanhe seus projetos, tarefas, memórias e agentes.">
      <div className="workspace-stack">
        <div className="actions"><Link className="button-link" href="/nexus">Abrir Nexus</Link><Link href="/historico">Histórico de conversas</Link></div>
        {userId ? <Suspense fallback={<p className="panel muted" role="status">Carregando seu resumo…</p>}><HomeOverview userId={userId} /></Suspense> : <section className="panel"><h2>Sua organização começa aqui</h2><p className="muted">Entre para ver suas tarefas, prazos e projetos em um só lugar.</p><p><Link className="button-link" href="/entrar">Entrar / criar conta</Link></p></section>}
      </div>
      <h2 className="overview-shortcuts">Seus espaços</h2>
      <div className="grid">{modules.map(([title, description, href]) => <article key={title}><span className="line"/><h3>{title}</h3><p>{description}</p><a className="module-link" href={href}>Abrir {title.toLowerCase()} →</a></article>)}</div>
    </AppShell>
  );
}
