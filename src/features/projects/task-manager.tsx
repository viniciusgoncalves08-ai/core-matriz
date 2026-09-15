"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { taskStatuses } from "./work-labels";
import { useWorkspace } from "./use-workspace";
type Task = { id: string; title: string; description: string | null; status: keyof typeof taskStatuses; priority: number; dueAt: string | null; projectId: string | null; project: { name: string } | null };
const priorities = ["Normal", "Média", "Alta", "Urgente"];
const empty = { title: "", description: "", status: "TODO" as Task["status"], priority: 0, dueAt: "", projectId: "" };
export function TaskManager({ projects, projectId }: { projects: { id: string; name: string }[]; projectId?: string }) {
  const state = useWorkspace<Task>(projectId ? `/api/tasks?projectId=${encodeURIComponent(projectId)}` : "/api/tasks", "tasks");
  const [form, setForm] = useState({ ...empty, projectId: projectId || "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("OPEN");
  const [search, setSearch] = useState("");
  const visible = state.items.filter(t => (filter === "ALL" || (filter === "OPEN" ? !["COMPLETED", "CANCELLED"].includes(t.status) : t.status === filter)) && t.title.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  const done = state.items.filter(t => t.status === "COMPLETED").length;
  const ongoing = state.items.filter(t => t.status === "IN_PROGRESS").length;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await state.save(editing ? `/api/tasks/${editing}` : "/api/tasks", { ...form, projectId: form.projectId || null, dueAt: form.dueAt || null }, editing ? "PATCH" : "POST")) { setOpen(false); setEditing(null); setForm({ ...empty, projectId: projectId || "" }); }
  }
  return <div className="workspace-stack">
    <div className="actions"><button disabled={state.busy} onClick={() => { setEditing(null); setForm({ ...empty, projectId: projectId || "" }); setOpen(true); }}>+ Nova tarefa</button><Link href="/projetos">Meus projetos</Link>{projectId && <Link href="/tarefas">Todas as tarefas</Link>}</div>
    {state.error && <div role="alert" className="chat-error">{state.error} <button disabled={state.busy} onClick={() => void state.retry()}>Recarregar</button> <Link href="/entrar">Entrar</Link></div>}
    {state.notice && <p role="status">{state.notice}</p>}
    {open && <form className="panel workspace-form" onSubmit={submit}>
      <h2>{editing ? "Editar tarefa" : "Qual é o próximo passo?"}</h2>
      <label>Título<input autoFocus required minLength={2} maxLength={200} disabled={state.busy} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Definir os produtos da loja" /></label>
      <label>Detalhes<textarea maxLength={5000} disabled={state.busy} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
      <div className="work-fields"><label>Situação<select disabled={state.busy} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Task["status"] })}>{Object.entries(taskStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Prioridade<select disabled={state.busy} value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })}>{priorities.map((label, value) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Prazo<input type="date" disabled={state.busy} value={form.dueAt} onChange={e => setForm({ ...form, dueAt: e.target.value })} /></label>
      <label>Projeto<select disabled={state.busy || Boolean(projectId)} value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })}><option value="">Sem projeto</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>
      <div className="actions"><button disabled={state.busy}>{state.busy ? "Salvando…" : "Salvar tarefa"}</button><button type="button" disabled={state.busy} onClick={() => setOpen(false)}>Cancelar</button></div>
    </form>}
    {!state.loading && <div className="work-summary" aria-label="Resumo das tarefas"><div><strong>{state.items.length}</strong><span>Total</span></div><div><strong>{ongoing}</strong><span>Em andamento</span></div><div><strong>{done}</strong><span>Concluídas</span></div></div>}
    <div className="filters workspace-form"><label>Buscar tarefa<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Título da tarefa" /></label><label>Mostrar<select value={filter} onChange={e => setFilter(e.target.value)}><option value="OPEN">Em aberto</option><option value="ALL">Todas</option>{Object.entries(taskStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    {state.loading ? <p role="status">Carregando tarefas…</p> : !state.error && visible.length === 0 && <div className="panel"><h2>{state.items.length ? "Nenhuma tarefa neste filtro" : "Um passo de cada vez"}</h2><p className="muted">{state.items.length ? "Altere o filtro para ver as outras tarefas." : "Adicione sua primeira tarefa. Você pode definir um prazo e uma prioridade."}</p></div>}
    {visible.map(task => <article className="panel task-card" key={task.id}>
      <div className="actions"><span className="tag">{taskStatuses[task.status]}</span><span className={`tag priority-${task.priority}`}>{priorities[task.priority]}</span>{task.dueAt && <span className="muted">Prazo: {task.dueAt.slice(0, 10).split("-").reverse().join("/")}</span>}</div>
      <h2>{task.title}</h2>{task.description && <p className="preserve-text muted">{task.description}</p>}{task.project && <p><Link href={`/projetos/${task.projectId}`}>{task.project.name}</Link></p>}
      <div className="actions"><button disabled={state.busy} onClick={() => void state.save(`/api/tasks/${task.id}`, { status: task.status === "COMPLETED" ? "TODO" : "COMPLETED" }, "PATCH")}>{task.status === "COMPLETED" ? "Reabrir" : "Concluir"}</button>{["TODO", "INBOX"].includes(task.status) && <button disabled={state.busy} onClick={() => void state.save(`/api/tasks/${task.id}`, { status: "IN_PROGRESS" }, "PATCH")}>Iniciar</button>}<button disabled={state.busy} onClick={() => { setEditing(task.id); setForm({ title: task.title, description: task.description || "", status: task.status, priority: task.priority, dueAt: task.dueAt?.slice(0, 10) || "", projectId: task.projectId || "" }); setOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Editar</button></div>
    </article>)}
  </div>;
}
