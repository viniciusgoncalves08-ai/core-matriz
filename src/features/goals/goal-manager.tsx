"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useWorkspace } from "@/features/projects/use-workspace";
import { goalStatuses } from "./goal-schema";
type Goal = { id: string; title: string; description: string | null; category: string | null; status: keyof typeof goalStatuses; progress: number; dueAt: string | null; projectId: string | null; project: { name: string } | null };
const empty = { title: "", description: "", category: "", status: "active" as Goal["status"], progress: 0, dueAt: "", projectId: "" };
export function GoalManager({ projects }: { projects: { id: string; name: string }[] }) {
  const state = useWorkspace<Goal>("/api/goals", "goals");
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const visible = state.items.filter(goal => (filter === "all" || goal.status === filter) && (goal.title + " " + (goal.category ?? "")).toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await state.save(editing ? "/api/goals/" + editing : "/api/goals", { ...form, dueAt: form.dueAt || null, projectId: form.projectId || null }, editing ? "PATCH" : "POST")) {
      setOpen(false); setEditing(null); setForm(empty);
    }
  }
  function edit(goal: Goal) {
    setEditing(goal.id);
    setForm({ title: goal.title, description: goal.description ?? "", category: goal.category ?? "", status: goal.status, progress: goal.progress, dueAt: goal.dueAt?.slice(0, 10) ?? "", projectId: goal.projectId ?? "" });
    setOpen(true); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  return <div className="workspace-stack">
    <div className="actions"><button disabled={state.busy} onClick={() => { setForm(empty); setEditing(null); setOpen(true); }}>+ Novo objetivo</button><Link href="/atividade?kind=goal">Histórico de alterações</Link></div>
    <p className="muted">Atualize o progresso manualmente. Concluir um objetivo define 100%; isso não conclui as tarefas do projeto.</p>
    {state.error && <p className="chat-error" role="alert">{state.error} <button onClick={() => void state.retry()} disabled={state.busy}>Recarregar</button></p>}
    {state.notice && <p role="status">{state.notice}</p>}
    {open && <form className="panel workspace-form" onSubmit={submit}>
      <h2>{editing ? "Editar objetivo" : "Seu próximo objetivo"}</h2>
      <label>Título<input autoFocus required minLength={2} maxLength={200} value={form.title} disabled={state.busy} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
      <label>Descrição<textarea maxLength={5000} value={form.description} disabled={state.busy} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
      <div className="work-fields">
        <label>Categoria<input maxLength={80} placeholder="Ex.: Pessoal, trabalho, saúde" value={form.category} disabled={state.busy} onChange={e => setForm({ ...form, category: e.target.value })} /></label>
        <label>Situação<select value={form.status} disabled={state.busy} onChange={e => setForm({ ...form, status: e.target.value as Goal["status"] })}>{Object.entries(goalStatuses).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Progresso (%)<input type="number" min={0} max={100} step={1} required value={form.status === "completed" ? 100 : form.progress} disabled={state.busy || form.status === "completed"} onChange={e => setForm({ ...form, progress: Number(e.target.value) })} /></label>
        <label>Prazo opcional<input type="date" value={form.dueAt} disabled={state.busy} onChange={e => setForm({ ...form, dueAt: e.target.value })} /></label>
        <label>Projeto relacionado<select value={form.projectId} disabled={state.busy} onChange={e => setForm({ ...form, projectId: e.target.value })}><option value="">Sem projeto</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
      </div>
      <div className="actions"><button disabled={state.busy}>{state.busy ? "Salvando…" : "Salvar objetivo"}</button><button type="button" disabled={state.busy} onClick={() => setOpen(false)}>Cancelar edição</button></div>
    </form>}
    <div className="filters workspace-form"><label>Buscar objetivo<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Título ou categoria" /></label><label>Situação<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Todas</option>{Object.entries(goalStatuses).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    {state.loading ? <p role="status">Carregando objetivos…</p> : !state.error && !visible.length && <div className="panel"><h2>{state.items.length ? "Nenhum objetivo neste filtro" : "Nenhum objetivo ainda"}</h2><p className="muted">{state.items.length ? "Altere a busca ou situação." : "Defina o que quer alcançar e registre seu primeiro passo."}</p></div>}
    {visible.map(goal => <article key={goal.id} className="panel workspace-stack">
      <div className="actions"><span className="tag">{goalStatuses[goal.status] ?? goal.status}</span>{goal.category && <span className="tag">{goal.category}</span>}</div>
      <h2>{goal.title}</h2>{goal.description && <p className="muted preserve-text">{goal.description}</p>}
      <div><label htmlFor={"progress-" + goal.id}>Progresso: {goal.progress}%</label><progress className="goal-progress" id={"progress-" + goal.id} value={goal.progress} max={100}>{goal.progress}%</progress></div>
      <p className="muted">{goal.dueAt ? "Prazo: " + goal.dueAt.slice(0, 10).split("-").reverse().join("/") : "Sem prazo definido"}</p>
      {goal.project && <Link href={"/projetos/" + goal.projectId}>{goal.project.name}</Link>}
      <div className="actions"><button disabled={state.busy} onClick={() => edit(goal)}>Editar objetivo</button>{!["completed","cancelled"].includes(goal.status) && <button disabled={state.busy} onClick={() => void state.save("/api/goals/" + goal.id, { status: "completed" }, "PATCH")}>Marcar como concluído</button>}</div>
    </article>)}
  </div>;
}
