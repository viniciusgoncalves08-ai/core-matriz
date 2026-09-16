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
function ActionCard({ action, onUpdate }: { action: ActionView; onUpdate: (action: ActionView) => void }) {
  const [title, setTitle] = useState(action.input.title);
  const [dueAt, setDueAt] = useState(action.input.dueAt ?? "");
  const [priority, setPriority] = useState(action.input.priority);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function decide(decision: "confirm" | "cancel") {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/actions/${action.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(decision === "cancel" ? { decision } : { decision, input: { title, dueAt: dueAt || null, priority } }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível concluir a ação.");
      onUpdate(data.action);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha na conexão. Confira o resultado antes de tentar novamente."); }
    finally { setBusy(false); }
  }
  const pending = action.status === "pending";
  return <article className="panel workspace-form">
    <div className="actions"><strong>Criar tarefa</strong><span className="tag">{({ pending: "Aguardando confirmação", executing: "Processando", succeeded: "Tarefa criada", cancelled: "Cancelada", expired: "Expirada" })[action.status]}</span></div>
    {pending ? <form className="workspace-form" onSubmit={event => { event.preventDefault(); void decide("confirm"); }}>
      <label>Título<input value={title} onChange={event => setTitle(event.target.value)} required minLength={2} maxLength={200} disabled={busy} /></label>
      <div className="work-fields"><label>Prazo opcional<input type="date" value={dueAt} onChange={event => setDueAt(event.target.value)} disabled={busy} /></label>
        <label>Prioridade<select value={priority} onChange={event => setPriority(Number(event.target.value))} disabled={busy}><option value={0}>Normal</option><option value={1}>Média</option><option value={2}>Alta</option><option value={3}>Urgente</option></select></label></div>
      <p className="muted">Confirme o prazo no campo acima. Criar a tarefa não ativa lembrete ou notificação.</p>
      <p className="muted">Proposta válida até {new Date(action.expiresAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (Brasília).</p>
      <div className="actions"><button type="submit" disabled={busy || title.trim().length < 2}>{busy ? "Processando…" : "Confirmar e criar tarefa"}</button><button type="button" disabled={busy} onClick={() => void decide("cancel")}>Cancelar proposta</button></div>
    </form> : <>
      <p className="preserve-text">{action.input.title}</p>
      {action.status === "succeeded" ? <><p className="muted">Prazo: {action.input.dueAt ?? "não definido"} · Prioridade: {(["Normal", "Média", "Alta", "Urgente"])[action.input.priority]}</p><Link href="/tarefas">Ver em Tarefas →</Link></> : <p className="muted">{action.status === "executing" ? "Atualize a conversa para conferir o resultado." : "Nenhuma tarefa foi criada por esta proposta."}</p>}
    </>}
    {error && <p role="alert" className="chat-error">{error}</p>}
  </article>;
}
