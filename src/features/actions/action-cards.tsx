"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { ActionView } from "./action-schema";

export function ActionCards({ conversationId, refresh }: { conversationId: string; refresh: number }) {
  const [actions, setActions] = useState<ActionView[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const abort = new AbortController(); setLoading(true); setError("");
    fetch(`/api/conversations/${conversationId}/actions`, { signal: abort.signal, cache: "no-store" }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar as ações.");
      if (!abort.signal.aborted) setActions(current => data.actions.map((item: ActionView) => {
        const saved = current.find(previous => previous.id === item.id);
        return saved && saved.status !== "pending" && item.status === "pending" ? saved : item;
      }));
    }).catch(cause => { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : "Falha ao carregar ações."); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [conversationId, refresh, revision]);
  return <section className="workspace-stack action-section" aria-label="Ações da conversa">
    {loading && <p className="muted" role="status">Verificando ações da conversa…</p>}
    {error && <p role="alert" className="chat-error">{error} <button onClick={() => setRevision(v => v + 1)}>Atualizar ações</button></p>}
    {actions.length > 0 && <h2>Ações da conversa</h2>}
    {actions.map(action => <ActionCard key={action.id} action={action} onUpdate={updated => setActions(current => current.map(item => item.id === updated.id ? updated : item))} />)}
    {actions.length === 30 && <p className="muted">Exibindo as 30 propostas mais recentes desta conversa.</p>}
  </section>;
}
export function ActionCard({ action, onUpdate }: { action: ActionView; onUpdate: (action: ActionView) => void }) {
  const isProject = action.tool === "project.create";
  const [title, setTitle] = useState(action.tool === "task.create" ? action.input.title : action.input.name);
  const [dueAt, setDueAt] = useState(action.tool === "task.create" ? action.input.dueAt ?? "" : "");
  const [priority, setPriority] = useState(action.tool === "task.create" ? action.input.priority : 0);
  const [description, setDescription] = useState(action.tool === "project.create" ? action.input.description : "");
  const [projectStatus, setProjectStatus] = useState<"IDEA" | "PLANNING" | "ACTIVE">(action.tool === "project.create" ? action.input.status : "IDEA");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function decide(decision: "confirm" | "cancel") {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const input = isProject ? { name: title, description, status: projectStatus } : { title, dueAt: dueAt || null, priority };
      const response = await fetch(`/api/actions/${action.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(decision === "cancel" ? { decision } : { decision, input }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível concluir a ação.");
      onUpdate(data.action);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha na conexão. Confira o resultado antes de tentar novamente."); }
    finally { setBusy(false); }
  }
  const pending = action.status === "pending";
  return <article className="panel workspace-form">
    <div className="actions"><strong>{isProject ? "Criar projeto" : "Criar tarefa"}</strong><span className="tag">{({ pending: "Aguardando confirmação", executing: "Processando", succeeded: isProject ? "Projeto criado" : "Tarefa criada", cancelled: "Cancelada", expired: "Expirada" })[action.status]}</span></div>
    {pending ? <form className="workspace-form" onSubmit={event => { event.preventDefault(); void decide("confirm"); }}>
      <label>{isProject ? "Nome do projeto" : "Título"}<input value={title} onChange={event => setTitle(event.target.value)} required minLength={2} maxLength={isProject ? 120 : 200} disabled={busy} /></label>
      {isProject ? <>
        <label>Descrição<textarea value={description} maxLength={5000} disabled={busy} onChange={event => setDescription(event.target.value)} /></label>
        <label>Situação inicial<select value={projectStatus} disabled={busy} onChange={event => setProjectStatus(event.target.value as typeof projectStatus)}><option value="IDEA">Ideia</option><option value="PLANNING">Planejamento</option><option value="ACTIVE">Ativo</option></select></label>
        <p className="muted">O projeto será salvo após sua confirmação. Isso não cria tarefas, lembretes ou acompanhamento automático.</p>
      </> : <>
        <div className="work-fields"><label>Prazo opcional<input type="date" value={dueAt} onChange={event => setDueAt(event.target.value)} disabled={busy} /></label>
          <label>Prioridade<select value={priority} onChange={event => setPriority(Number(event.target.value))} disabled={busy}><option value={0}>Normal</option><option value={1}>Média</option><option value={2}>Alta</option><option value={3}>Urgente</option></select></label></div>
        <p className="muted">Confirme o prazo no campo acima. Criar a tarefa não ativa lembrete ou notificação.</p>
      </>}
      <p className="muted">Proposta válida até {new Date(action.expiresAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (Brasília).</p>
      <div className="actions"><button type="submit" disabled={busy || title.trim().length < 2}>{busy ? "Processando…" : isProject ? "Confirmar e criar projeto" : "Confirmar e criar tarefa"}</button><button type="button" disabled={busy} onClick={() => void decide("cancel")}>Cancelar proposta</button></div>
    </form> : <>
      <p className="preserve-text">{action.tool === "task.create" ? action.input.title : action.input.name}</p>
      {action.status === "succeeded" ? action.tool === "project.create" ? <>
        {action.input.description && <p className="preserve-text muted">{action.input.description}</p>}
        <Link href={action.projectId ? `/projetos/${action.projectId}` : "/projetos"}>Abrir projeto →</Link>
      </> : <><p className="muted">Prazo: {action.input.dueAt ?? "não definido"} · Prioridade: {(["Normal", "Média", "Alta", "Urgente"])[action.input.priority]}</p><Link href="/tarefas">Ver em Tarefas →</Link></> : <p className="muted">{action.status === "executing" ? "Atualize a conversa para conferir o resultado." : "Nenhum registro foi criado por esta proposta."}</p>}
    </>}
    {error && <p role="alert" className="chat-error">{error}</p>}
  </article>;
}
