"use client";
import { useState } from "react";
import Link from "next/link";
import type { ActionView } from "./action-schema";
const labels = { INBOX: "Entrada", TODO: "A fazer", IN_PROGRESS: "Em andamento", BLOCKED: "Bloqueada", COMPLETED: "Concluída", CANCELLED: "Cancelada" };
export function TaskUpdateCard({ action, onUpdate }: { action: Extract<ActionView, { tool: "task.update" }>; onUpdate: (action: ActionView) => void }) {
  const [input, setInput] = useState(action.input);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function decide(decision: "confirm" | "cancel") {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/actions/${action.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(decision === "cancel" ? { decision } : { decision, input }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível atualizar a tarefa.");
      onUpdate(data.action);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha na conexão. Atualize as ações para conferir o resultado."); }
    finally { setBusy(false); }
  }
  return <article className="panel workspace-form">
    <div className="actions"><strong>Editar tarefa</strong><span className="tag">{({ pending: "Aguardando confirmação", executing: "Processando", succeeded: "Tarefa atualizada", cancelled: "Proposta cancelada", expired: "Expirada" })[action.status]}</span></div>
    {action.status === "pending" ? <form className="workspace-form" onSubmit={event => { event.preventDefault(); void decide("confirm"); }}>
      <label>Título<input required minLength={2} maxLength={200} value={input.title} disabled={busy} onChange={event => setInput({ ...input, title: event.target.value })} /></label>
      <label>Situação<select value={input.status} disabled={busy} onChange={event => setInput({ ...input, status: event.target.value as typeof input.status })}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <div className="work-fields">
        <label>Prazo opcional<input type="date" value={input.dueAt ?? ""} disabled={busy} onChange={event => setInput({ ...input, dueAt: event.target.value || null })} /></label>
        <label>Prioridade<select value={input.priority} disabled={busy} onChange={event => setInput({ ...input, priority: Number(event.target.value) })}>{["Normal", "Média", "Alta", "Urgente"].map((label, value) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <p className="muted">Revise e confirme para salvar. O prazo organiza a tarefa, mas não ativa notificações.</p>
      <p className="muted">Proposta válida até {new Date(action.expiresAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (Brasília).</p>
      <div className="actions"><button disabled={busy || input.title.trim().length < 2} type="submit">{busy ? "Processando…" : "Confirmar alterações"}</button><button disabled={busy} type="button" onClick={() => void decide("cancel")}>Cancelar proposta</button></div>
    </form> : <>
      <p className="preserve-text">{action.input.title}</p>
      {action.status === "succeeded" ? <><p>{labels[action.input.status]} · Prazo: {action.input.dueAt ?? "não definido"} · Prioridade: {["Normal", "Média", "Alta", "Urgente"][action.input.priority]}</p><Link href="/tarefas">Ver em Tarefas →</Link></> : <p className="muted">{action.status === "executing" ? "Atualize a conversa para conferir o resultado." : "Nenhuma alteração foi feita por esta proposta."}</p>}
    </>}
    {error && <p role="alert" className="chat-error">{error}</p>}
  </article>;
}
