"use client";
import { useState } from "react";
import Link from "next/link";
import type { ActionView } from "./action-schema";
const categories = { FACT: "Fato", PREFERENCE: "Preferência", DECISION: "Decisão", HYPOTHESIS: "Hipótese", OBSERVED_PATTERN: "Padrão observado", CONTEXT: "Contexto", KNOWLEDGE: "Conhecimento", RESTRICTION: "Restrição", GOAL: "Objetivo" };
export function MemoryActionCard({ action, onUpdate }: { action: Extract<ActionView, { tool: "memory.create" }>; onUpdate: (action: ActionView) => void }) {
  const [content, setContent] = useState(action.input.content);
  const [classification, setClassification] = useState(action.input.classification);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function decide(decision: "confirm" | "cancel") {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/actions/${action.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(decision === "cancel" ? { decision } : { decision, input: { content, classification } }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível salvar a memória.");
      onUpdate(data.action);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha na conexão. Atualize as ações para conferir o resultado."); }
    finally { setBusy(false); }
  }
  return <article className="panel workspace-form">
    <div className="actions"><strong>Salvar memória</strong><span className="tag">{({ pending: "Aguardando confirmação", executing: "Processando", succeeded: "Memória salva", cancelled: "Cancelada", expired: "Expirada" })[action.status]}</span></div>
    {action.status === "pending" ? <form className="workspace-form" onSubmit={event => { event.preventDefault(); void decide("confirm"); }}>
      <label>O que guardar?<textarea required minLength={2} maxLength={12000} value={content} disabled={busy} onChange={event => setContent(event.target.value)} /></label>
      <label>Classificação<select value={classification} disabled={busy} onChange={event => setClassification(event.target.value as typeof classification)}>{Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <p className="muted">Guarde apenas o que deseja usar em conversas futuras. Hipóteses e padrões não são fatos confirmados. Você poderá corrigir ou bloquear esta memória depois.</p>
      <p className="muted">Proposta válida até {new Date(action.expiresAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (Brasília).</p>
      <div className="actions"><button type="submit" disabled={busy || content.trim().length < 2}>{busy ? "Salvando…" : "Confirmar e salvar memória"}</button><button type="button" disabled={busy} onClick={() => void decide("cancel")}>Cancelar proposta</button></div>
    </form> : <>
      <p className="preserve-text">{action.input.content}</p>
      <p className="muted">{categories[action.input.classification]}</p>
      {action.status === "succeeded" ? <Link href="/memoria">Revisar em Memória →</Link> : <p className="muted">{action.status === "executing" ? "Atualize as ações para conferir o resultado." : "Nenhuma memória foi salva por esta proposta."}</p>}
    </>}
    {error && <p role="alert" className="chat-error">{error}</p>}
  </article>;
}
