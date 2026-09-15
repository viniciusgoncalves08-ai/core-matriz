import { AppShell } from "@/components/app-shell";

const modules = [
  ["Tarefas", "Prioridades, prazos e próximos passos.", "/tarefas"],
  ["Memória", "Informações estruturadas que o Nexus pode recuperar.", "/memoria"],
  ["Projetos", "Da ideia à execução, com tarefas e progresso.", "/projetos"],
  ["Agentes", "Especialistas que você configura e escolhe para conversar.", "/agentes"],
];

export default function HomePage() {
  return (
    <AppShell active="Home" title="Seu espaço, conectado." description="Acompanhe seus projetos, tarefas, memórias e agentes.">
      <div className="grid">{modules.map(([title, description, href]) => <article key={title}><span className="line"/><h3>{title}</h3><p>{description}</p><a className="module-link" href={href}>Abrir {title.toLowerCase()} →</a></article>)}</div>
    </AppShell>
  );
}
