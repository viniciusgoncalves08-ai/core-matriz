"use client";
import { useState } from "react";
import Link from "next/link";
import { goalStatuses } from "@/features/goals/goal-schema";
import type { ActionView } from "./action-schema";
export function GoalActionCard({ action, onUpdate }: { action: Extract<ActionView, { tool: "goal.create" | "goal.update" }>; onUpdate: (action: ActionView) => void }) {
  const [input, setInput] = useState(action.input);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isEdit = action.tool === "goal.update";
  async function decide(decision: "confirm" | "cancel") {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/actions/${action.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(decision === "cancel" ? { decision } : { decision, input }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar o objetivo.");
      onUpdate(data.action);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha na conexão. Atualize as ações para conferir o resultado."); }
    finally { setBusy(false); }
  }
  return <article className="panel workspace-form" aria-busy={busy}>
    <div className="actions"><strong>{isEdit ? "Editar objetivo" : "Criar objetivo"}</strong><span className="tag">{({ pending: "Aguardando confirmação", executing: "Processando", succeeded: "Objetivo salvo", cancelled: "Proposta cancelada", expired: "Expirada" })[action.status]}</span></div>
    {action.status === "pending" ? <form className="workspace-form" onSubmit={event => { event.preventDefault(); void decide("confirm"); }}>
      <label>Título<input required minLength={2} maxLength={200} value={input.title} disabled={busy} onChange={event => setInput({ ...input, title: event.target.value })} /></label>
      <label>Descrição<textarea maxLength={5000} value={input.description} disabled={busy} onChange={event => setInput({ ...input, description: event.target.value })} /></label>
      <label>Categoria<input maxLength={80} value={input.category} disabled={busy} onChange={event => setInput({ ...input, category: event.target.value })} /></label>
      <label>Situação<select value={input.status} disabled={busy} onChange={event => { const status = event.target.value as typeof input.status; setInput({ ...input, status, progress: status === "completed" ? 100 : input.progress }); }}>{Object.entries(goalStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <div className="work-fields"><label>Progresso (%)<input type="number" required min={0} max={100} step={1} value={input.progress} disabled={busy || input.status === "completed"} onChange={event => setInput({ ...input, progress: Number(event.target.value) })} /></label>
        <label>Prazo opcional<input type="date" value={input.dueAt ?? ""} disabled={busy} onChange={event => setInput({ ...input, dueAt: event.target.value || null })} /></label></div>
      <p>Projeto: {input.projectId ? action.projectName ?? "Projeto vinculado" : "Sem vínculo"}</p>
      {action.input.projectId && <label><input type="checkbox" checked={input.projectId !== null} disabled={busy} onChange={event => setInput({ ...input, projectId: event.target.checked ? action.input.projectId : null })} /> Manter vínculo com {action.projectName}</label>}
      <p className="muted">Concluir define o progresso em 100%. Para escolher outro projeto, cancele e faça um novo pedido com o nome completo. O prazo pode aparecer na Central de Alertas; não envia notificações com o app fechado.</p>
      <p className="muted">Proposta válida até {new Date(action.expiresAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (Brasília).</p>
      <div className="actions"><button disabled={busy || input.title.trim().length < 2} type="submit">{busy ? "Processando…" : isEdit ? "Confirmar alterações" : "Confirmar e criar objetivo"}</button><button disabled={busy} type="button" onClick={() => void decide("cancel")}>Cancelar proposta</button></div>
    </form> : <><p className="preserve-text">{action.input.title}</p>{action.status === "succeeded" ? <><p>{goalStatuses[action.input.status]} · {action.input.progress}% · Prazo: {action.input.dueAt ?? "não definido"}</p><Link href="/objetivos">Ver em Objetivos →</Link>{action.input.projectId && <Link href={`/projetos/${encodeURIComponent(action.input.projectId)}`}>Abrir projeto →</Link>}</> : <p>{action.status === "executing" ? "Atualize a conversa para conferir o resultado." : "Nenhuma alteração foi feita por esta proposta."}</p>}</>}
    {error && <p role="alert" className="chat-error">{error}</p>}
  </article>;
}
