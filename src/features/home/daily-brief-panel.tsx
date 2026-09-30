import Link from "next/link";
import { getDailyBrief } from "./daily-brief";
export async function DailyBriefPanel({ userId }: { userId: string }) {
  try {
    const data = await getDailyBrief(userId);
    return <section className="panel workspace-stack" aria-label="Resumo do dia">
      <div className="overview-heading"><h2>Seu dia, em foco</h2><span className="tag">{data.date.split("-").reverse().join("/")}</span></div>
      <p>{data.overdue || data.dueToday ? `${data.overdue} tarefa(s) atrasada(s) e ${data.dueToday} com prazo hoje.` : "Nenhuma tarefa em aberto com prazo até hoje."}</p>
      <div className="overview-columns">
        <div><h3>Prazos que pedem atenção</h3>{data.tasks.length ? <ul className="overview-list">{data.tasks.map(t => <li key={t.id}><Link href="/tarefas">{t.title}</Link><small>{t.dueAt!.toISOString().slice(0,10) < data.date ? "Atrasada" : "Prazo hoje"}{t.status === "BLOCKED" ? " · bloqueada" : ""}</small></li>)}</ul> : <p className="muted">Tarefas futuras e sem prazo continuam disponíveis em Tarefas.</p>}</div>
        <div><h3>Objetivos próximos ou vencidos</h3>{data.goals.length ? <ul className="overview-list">{data.goals.map(g => <li key={g.id}><Link href="/objetivos">{g.title}</Link><small>{g.progress}% · {g.dueAt!.toISOString().slice(0,10).split("-").reverse().join("/")}</small></li>)}</ul> : <p className="muted">Nenhum objetivo ativo com prazo vencido ou nos próximos 7 dias.</p>}</div>
      </div>
      <div><h3>Projetos ativos</h3>{data.projects.length ? <div className="actions">{data.projects.map(p => <Link className="tag" key={p.id} href={`/projetos/${p.id}`}>{p.name}</Link>)}</div> : <p className="muted">Nenhum projeto ativo cadastrado.</p>}</div>
      <p className="overview-footnote">Horário de Brasília. Até 6 tarefas, 4 objetivos e 4 projetos. Atualize a página para consultar novamente.</p>
      <p className="muted">No Nexus, diga “bom dia” ou “resumo do dia”. Esta consulta não ativa notificações.</p>
    </section>;
  } catch {
    return <section className="panel" role="alert"><h2>Resumo temporariamente indisponível</h2><p>Não foi possível consultar seus dados. <a href="/">Tentar novamente</a></p></section>;
  }
}
