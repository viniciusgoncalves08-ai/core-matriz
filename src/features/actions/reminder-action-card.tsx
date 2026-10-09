"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import type { ActionView } from "./action-schema";
import { ReminderFields } from "@/features/reminders/reminder-fields";
import { type ReminderInput, reminderLabels } from "@/features/reminders/reminder-schema";
export function ReminderActionCard({ action, onUpdate }: { action: Extract<ActionView, { tool: "reminder.create" | "reminder.update" }>; onUpdate: (action: ActionView) => void }) {
  const [input, setInput] = useState<ReminderInput>({ ...action.input, status: action.tool === "reminder.update" ? action.input.status : "scheduled" });
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const lock = useRef(false);
  const editing = action.tool === "reminder.update";
  async function decide(decision: "confirm" | "cancel") {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const reviewed = editing ? input : { title: input.title, date: input.date, time: input.time };
      const response = await fetch(`/api/actions/${action.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(decision === "cancel" ? { decision } : { decision, input: reviewed }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Não foi possível salvar o lembrete.");
      onUpdate(result.action);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha na conexão. Atualize as ações para conferir."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <article className="panel workspace-form" aria-busy={busy}>
    <strong>{editing ? "Editar lembrete" : "Criar lembrete interno"}</strong>
    <span className="tag">{({ pending: "Aguardando confirmação", executing: "Processando", succeeded: "Lembrete salvo", cancelled: "Proposta cancelada", expired: "Expirada" })[action.status]}</span>
    {action.status === "pending" ? <form className="workspace-form" onSubmit={event => { event.preventDefault(); void decide("confirm"); }}>
      <ReminderFields input={input} onChange={setInput} disabled={busy} showStatus={editing} />
      <p className="muted">Proposta válida até {new Date(action.expiresAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}. A data do lembrete também será conferida ao confirmar.</p>
      <div className="actions"><button disabled={busy} type="submit">{busy ? "Salvando…" : editing ? "Confirmar alterações" : "Confirmar e criar lembrete"}</button><button disabled={busy} type="button" onClick={() => void decide("cancel")}>Cancelar proposta</button></div>
    </form> : <><p>{action.input.title}</p><p>{action.input.date.split("-").reverse().join("/")} às {action.input.time} · Brasília</p>{action.status === "succeeded" ? <><p>{action.tool === "reminder.update" ? reminderLabels[action.input.status] : "Agendado"}</p><Link href="/alertas#lembretes">Abrir lembretes →</Link></> : <p>{action.status === "executing" ? "Atualize a conversa para conferir o resultado." : "Nenhuma alteração foi executada por esta proposta."}</p>}</>}
    {error && <p role="alert">{error}</p>}
  </article>;
}
