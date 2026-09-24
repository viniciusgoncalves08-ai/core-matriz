import Link from "next/link";
import { getOverview } from "./overview-service";
import { projectStatuses, taskStatuses } from "@/features/projects/work-labels";
const priorities = ["Normal", "Média", "Alta", "Urgente"];
function deadlineLabel(date: Date | null, today: Date) {
  if (!date) return "Sem prazo";
  const label = date.toISOString().slice(0, 10).split("-").reverse().join("/");
  if (date.getTime() < today.getTime()) return `Atrasada · ${label}`;
  if (date.getTime() === today.getTime()) return "Prazo hoje";
  return `Prazo ${label}`;
}
export async function HomeOverview({ userId }: { userId: string }) {
  let data;
  try { data = await getOverview(userId); }
  catch { return <div className="panel" role="alert"><h2>Não foi possível carregar seu resumo</h2><p className="muted">Seus atalhos continuam disponíveis. Tente atualizar a página em instantes.</p><p><a href="/">Atualizar resumo</a></p></div>; }
  const cards = [
    { title: "Tarefas em aberto", value: data.pending, href: "/tarefas" },
    { title: "Tarefas atrasadas", value: data.overdue, href: "/tarefas", attention: data.overdue > 0 },
    { title: "Projetos em aberto", value: data.projectsCount, href: "/projetos" },
    { title: "Memórias ativas", value: data.memoriesCount, href: "/memoria" },
  ];
  return <section className="workspace-stack" aria-label="Resumo da sua organização">
    <div className="overview-metrics">{cards.map(card => <Link className={`panel overview-metric${card.attention ? " needs-attention" : ""}`} href={card.href} key={card.title}><span>{card.title}</span><strong>{card.value}</strong><small>Ver detalhes →</small></Link>)}</div>
    <div className="overview-columns">
      <section className="panel"><div className="overview-heading"><h2>Prazos e prioridades</h2><Link href="/tarefas">Ver tarefas</Link></div><p className="muted">Primeiro os prazos mais próximos, incluindo os atrasados.</p>
        {data.tasks.length ? <ul className="overview-list">{data.tasks.map(task => <li key={task.id}><Link href={task.projectId ? `/projetos/${task.projectId}` : "/tarefas"}>{task.title}</Link><div className="actions"><span className="tag">{taskStatuses[task.status]}</span><span className={`tag priority-${task.priority}`}>{priorities[task.priority]}</span><span className={task.dueAt && task.dueAt < data.today ? "deadline-overdue" : "muted"}>{deadlineLabel(task.dueAt, data.today)}</span></div></li>)}</ul> : <div className="overview-empty"><h3>Nenhuma tarefa em aberto</h3><p className="muted">Adicione seu próximo passo ou aproveite para planejar um novo projeto.</p><Link className="button-link" href="/tarefas">Organizar tarefas</Link></div>}
        <p className="overview-footnote">Prazos por data, no horário de Brasília. Mostrando até 6 tarefas.</p>
      </section>
      <section className="panel"><div className="overview-heading"><h2>Projetos recentes</h2><Link href="/projetos">Ver projetos</Link></div><p className="muted">Projetos em aberto, atualizados recentemente.</p>
        {data.projects.length ? <ul className="overview-list">{data.projects.map(project => <li key={project.id}><Link href={`/projetos/${project.id}`}>{project.name}</Link><span className="tag">{projectStatuses[project.status]}</span></li>)}</ul> : <div className="overview-empty"><h3>Qual será sua próxima iniciativa?</h3><p className="muted">Crie um projeto para reunir suas ideias e tarefas.</p><Link className="button-link" href="/projetos">Organizar projetos</Link></div>}
      </section>
    </div>
    <section className="panel"><div className="overview-heading"><h2>Objetivos em andamento</h2><Link href="/objetivos">Ver objetivos</Link></div>
      {data.goals.length ? <ul className="overview-list">{data.goals.map(goal => <li key={goal.id}><Link href="/objetivos">{goal.title}</Link><span>{goal.progress}%</span><progress className="goal-progress" aria-label={"Progresso de " + goal.title} value={goal.progress} max={100} /><p className={goal.dueAt && goal.dueAt < data.today ? "deadline-overdue" : "muted"}>{goal.dueAt && goal.dueAt < data.today ? "Prazo vencido · " : ""}{goal.dueAt ? goal.dueAt.toISOString().slice(0, 10).split("-").reverse().join("/") : "Sem prazo"}</p></li>)}</ul> : <p className="muted">Nenhum objetivo em andamento. <Link href="/objetivos">Defina seu primeiro objetivo.</Link></p>}
      <p className="overview-footnote">Até 4 objetivos, priorizando os prazos mais próximos. Progresso informado por você.</p>
    </section>
  </section>;
}
