import { NexusChat } from "@/features/nexus/nexus-chat";

const modules = [
  ["Hoje", "Seu foco operacional e próximos compromissos."],
  ["Memória", "Informações estruturadas que o Nexus pode recuperar."],
  ["Projetos", "Iniciativas, decisões, tarefas e contexto relacionado."],
  ["Agentes", "Especialistas coordenados pelo Nexus quando necessário."],
];

export default function HomePage() {
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="mark">N</span><div><strong>Core Matriz</strong><small>Nexus</small></div></div>
        <nav>{["Home", "Nexus", "Projetos", "Tarefas", "Objetivos", "Memória", "Agentes", "Empresas", "Automações", "Histórico", "Configurações"].map((item, index) => <a className={index === 0 ? "active" : ""} href="#" key={item}>{item}</a>)}</nav>
      </aside>
      <section className="content">
        <header><div><p className="eyebrow">CORE MATRIZ</p><h1>Boa tarde.</h1><p className="muted">O Nexus está pronto para organizar contexto, decisões e execução.</p></div><span className="status">● Fundação ativa</span></header>
        <section className="nexus-card">
          <div className="orb">N</div><div className="nexus-copy"><span>NEXUS</span><h2>O que precisa da sua atenção agora?</h2><p>Converse naturalmente. O contexto relevante será recuperado sem carregar informações desnecessárias.</p></div>
          <NexusChat />
        </section>
        <div className="grid">{modules.map(([title, description]) => <article key={title}><span className="line"/><h3>{title}</h3><p>{description}</p><small>Fundação preparada</small></article>)}</div>
      </section>
      <nav className="bottom-nav">{["Home", "Nexus", "Projetos", "Memória"].map(x => <a href="#" key={x}>{x}</a>)}</nav>
    </main>
  );
}
