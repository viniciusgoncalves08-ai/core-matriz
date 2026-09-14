import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/#nexus", label: "Nexus" },
  { href: "/projetos", label: "Projetos" },
  { href: "/tarefas", label: "Tarefas" },
  { href: "/objetivos", label: "Objetivos" },
  { href: "/memoria", label: "Memória" },
  { href: "/agentes", label: "Agentes" },
  { href: "/empresas", label: "Empresas" },
  { href: "/automacoes", label: "Automações" },
  { href: "/historico", label: "Histórico" },
  { href: "/configuracoes", label: "Configurações" },
];

const bottomNavItems = [
  { href: "/", label: "Home" },
  { href: "/#nexus", label: "Nexus" },
  { href: "/projetos", label: "Projetos" },
  { href: "/memoria", label: "Memória" },
];

type AppShellProps = {
  active: string;
  eyebrow?: string;
  title: string;
  description: string;
  status?: string;
  children: ReactNode;
};

export function AppShell({ active, eyebrow = "CORE MATRIZ", title, description, status = "● Fundação ativa", children }: AppShellProps) {
  return (
    <main className="shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Core Matriz Home">
          <span className="mark">N</span>
          <div>
            <strong>Core Matriz</strong>
            <small>Nexus</small>
          </div>
        </a>
        <nav>
          {navItems.map((item) => (
            <a className={item.label === active ? "active" : ""} href={item.href} key={item.label}>
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      <section className="content">
        <header>
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="muted">{description}</p>
          </div>
          <span className="status">{status}</span>
        </header>
        {children}
      </section>

      <nav className="bottom-nav">
        {bottomNavItems.map((item) => (
          <a className={item.label === active ? "active" : ""} href={item.href} key={item.label}>
            {item.label}
          </a>
        ))}
      </nav>
    </main>
  );
}
