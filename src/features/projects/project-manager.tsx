"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { projectStatuses, taskStatuses } from "./work-labels";
import { useWorkspace } from "./use-workspace";
type Project = { id: string; name: string; description: string | null; status: keyof typeof projectStatuses; tasks: { status: keyof typeof taskStatuses }[] };
const empty = { name: "", description: "", status: "IDEA" as Project["status"] };
export function ProjectManager() {
  const state = useWorkspace<Project>("/api/projects", "projects");
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("OPEN");
  const visible = state.items.filter(p => (filter === "ALL" || (filter === "OPEN" ? !["ARCHIVED", "COMPLETED"].includes(p.status) : p.status === filter)) && `${p.name} ${p.description || ""}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await state.save(editing ? `/api/projects/${editing}` : "/api/projects", form, editing ? "PATCH" : "POST")) { setOpen(false); setEditing(null); setForm(empty); }
  }
  return <div className="workspace-stack">
    <div className="actions"><button disabled={state.busy} onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}>+ Novo projeto</button><Link href="/tarefas">Ver todas as tarefas</Link></div>
    {state.error && <div role="alert" className="chat-error">{state.error} <button disabled={state.busy} onClick={() => void state.retry()}>Recarregar</button> <Link href="/entrar">Entrar</Link></div>}
    {state.notice && <p role="status">{state.notice}</p>}
    {open && <form className="panel workspace-form" onSubmit={submit}>
      <h2>{editing ? "Editar projeto" : "Qual ideia vamos tirar do papel?"}</h2>
      <label>Nome<input autoFocus required minLength={2} maxLength={120} disabled={state.busy} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Lançar minha loja" /></label>
      <label>Objetivo e descrição<textarea maxLength={5000} disabled={state.busy} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="O que você quer alcançar?" /></label>
      <label>Situação<select disabled={state.busy} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Project["status"] })}>{Object.entries(projectStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <div className="actions"><button disabled={state.busy}>{state.busy ? "Salvando…" : "Salvar projeto"}</button><button type="button" disabled={state.busy} onClick={() => setOpen(false)}>Cancelar</button></div>
    </form>}
    <div className="filters workspace-form">
      <label>Buscar projeto<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome ou descrição" /></label>
      <label>Mostrar<select value={filter} onChange={e => setFilter(e.target.value)}><option value="OPEN">Em aberto</option><option value="ALL">Todos</option>{Object.entries(projectStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    {state.loading ? <p role="status">Carregando projetos…</p> : !state.error && visible.length === 0 && <div className="panel"><h2>{state.items.length ? "Nenhum projeto neste filtro" : "Seu próximo projeto começa aqui"}</h2><p className="muted">{state.items.length ? "Altere a busca ou a situação para encontrar outros projetos." : "Crie um projeto e divida seu objetivo em pequenas tarefas."}</p></div>}
    <div className="project-grid">{visible.map(project => {
      const total = project.tasks.filter(t => t.status !== "CANCELLED").length;
      const done = project.tasks.filter(t => t.status === "COMPLETED").length;
      return <article className="panel project-card" key={project.id}>
        <span className="tag">{projectStatuses[project.status]}</span><h2><Link href={`/projetos/${project.id}`}>{project.name}</Link></h2><p className="preserve-text muted">{project.description || "Adicione uma descrição para dar direção ao projeto."}</p>
        <div className="project-progress"><span>{done} de {total} tarefas concluídas</span><progress aria-label={`Progresso de ${project.name}`} max={total || 1} value={done} /></div>
        <div className="actions"><Link className="button-link" href={`/projetos/${project.id}`}>Abrir projeto</Link><button disabled={state.busy} onClick={() => { setEditing(project.id); setForm({ name: project.name, description: project.description || "", status: project.status }); setOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button><button disabled={state.busy} onClick={() => void state.save(`/api/projects/${project.id}`, { status: project.status === "ARCHIVED" ? "PLANNING" : "ARCHIVED" }, "PATCH")}>{project.status === "ARCHIVED" ? "Restaurar" : "Arquivar"}</button></div>
      </article>;
    })}</div>
  </div>;
}
