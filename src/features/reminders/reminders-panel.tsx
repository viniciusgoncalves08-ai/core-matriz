"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ReminderFields } from "./reminder-fields";
import { reminderLocalTime, reminderLabels, type ReminderInput } from "./reminder-schema";
type Row = { id: string; title: string; dueAt: string; status: ReminderInput["status"]; readAt: string | null; version: number };
type Data = { reminders: Row[]; total: number; unreadDue: number; page: number; hasMore: boolean; checkedAt: string };
export function RemindersPanel({ compact = false }: { compact?: boolean }) {
  const [filter, setFilter] = useState(compact ? "due" : "scheduled");
  const [page, setPage] = useState(1), [revision, setRevision] = useState(0);
  const [data, setData] = useState<Data | null>(null), [error, setError] = useState("");
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const lock = useRef(false);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible" && !lock.current) setRevision(v => v + 1); };
    const timer = window.setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("focus", refresh); };
  }, []);
  useEffect(() => {
    const abort = new AbortController(); setLoading(true);
    fetch(`/api/reminders?${new URLSearchParams({ filter, page: String(page) })}`, { cache: "no-store", signal: abort.signal }).then(async response => {
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Não foi possível consultar lembretes.");
      if (!abort.signal.aborted) setData(result);
    }).catch(cause => { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : "Falha na conexão."); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [filter, page, revision]);
  async function save(row: Row, input?: ReminderInput) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const response = await fetch(`/api/reminders/${encodeURIComponent(row.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input ? { operation: "update", version: row.version, input } : { operation: "read", version: row.version }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Não foi possível salvar.");
      setEditing(null); setRevision(v => v + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha na conexão. Atualize para conferir."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section id={compact ? undefined : "lembretes"} className="panel workspace-stack" aria-label="Lembretes internos">
    <div className="actions"><h2>Lembretes{data ? ` · ${data.unreadDue} vencido(s) não lido(s)` : ""}</h2><button type="button" disabled={busy || loading} onClick={() => { setError(""); setRevision(v => v + 1); }}>Atualizar</button>{compact && <Link href="/alertas#lembretes">Ver todos →</Link>}</div>
    <p className="muted">Atualização a cada minuto enquanto esta área estiver visível. Avisos internos, sem envio com o app fechado. Marcar como lido não conclui o lembrete.</p>
    {!compact && <><Link href="/nexus">Criar pelo Nexus →</Link><p>Exemplo: “Me lembre amanhã às 9h de ligar para o fornecedor”. Revise e confirme o cartão.</p><label>Mostrar<select value={filter} disabled={busy} onChange={event => { setFilter(event.target.value); setPage(1); setData(null); setError(""); }}><option value="scheduled">Agendados, incluindo vencidos</option><option value="due">Vencidos não lidos</option><option value="completed">Concluídos</option><option value="cancelled">Cancelados</option></select></label></>}
    {error && <p role="alert">{error}</p>}
    {loading && <p role="status">Atualizando lembretes…</p>}
    {editing && <ReminderEditor key={`${editing.id}:${editing.version}`} row={editing} busy={busy} onSave={input => void save(editing, input)} onCancel={() => setEditing(null)} />}
    {data && <>{!data.reminders.length && <p>Nenhum lembrete nesta página e filtro.</p>}{(compact ? data.reminders.slice(0, 3) : data.reminders).map(row => <article className="panel" key={row.id}><h3>{row.title}</h3><p>{new Date(row.dueAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · Brasília</p><p>{row.status === "scheduled" && row.dueAt <= data.checkedAt ? "Vencido" : reminderLabels[row.status]}{row.readAt ? " · Lido" : ""}</p><div className="actions">{row.status === "scheduled" && !row.readAt && row.dueAt <= data.checkedAt && <button type="button" disabled={busy} onClick={() => void save(row)}>Marcar como lido</button>}{!compact && <button type="button" disabled={busy} onClick={() => { setEditing(row); setError(""); }}>Editar, concluir ou cancelar</button>}</div></article>)}
    {!compact && <div className="actions"><span>{data.total} lembrete(s) · Página {data.page}</span><button type="button" disabled={busy || loading || page <= 1} onClick={() => { setPage(v => v - 1); setData(null); }}>Anterior</button><button type="button" disabled={busy || loading || !data.hasMore} onClick={() => { setPage(v => v + 1); setData(null); }}>Próxima</button></div>}</>}
  </section>;
}
function ReminderEditor({ row, busy, onSave, onCancel }: { row: Row; busy: boolean; onSave: (input: ReminderInput) => void; onCancel: () => void }) {
  const [input, setInput] = useState<ReminderInput>({ title: row.title, ...reminderLocalTime(row.dueAt), status: row.status });
  return <form className="panel workspace-form" onSubmit={event => { event.preventDefault(); onSave(input); }}><h3>Revisar lembrete</h3><ReminderFields input={input} onChange={setInput} disabled={busy} /><div className="actions"><button disabled={busy} type="submit">Confirmar alterações</button><button disabled={busy} type="button" onClick={onCancel}>Descartar edição</button></div></form>;
}
