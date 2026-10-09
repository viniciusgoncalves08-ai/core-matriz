"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
export function ProjectLinkControl({ kind, id, disabled = false, onBusy }: { kind: "conversation" | "memory"; id: string; disabled?: boolean; onBusy?: (busy: boolean) => void }) {
  const [data, setData] = useState<{ projectId: string | null; projects: Array<{ id: string; name: string }> } | null>(null);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const saveLock = useRef(false);
  useEffect(() => {
    const abort = new AbortController(); setData(null); setError(""); setNotice("");
    fetch(`/api/project-links?${new URLSearchParams({ kind, id })}`, { cache: "no-store", signal: abort.signal }).then(async response => {
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Não foi possível carregar o projeto.");
      if (!abort.signal.aborted) { setData(result); setSelected(result.projectId ?? ""); }
    }).catch(cause => { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : "Falha de conexão."); });
    return () => abort.abort();
  }, [kind, id, revision]);
  async function save() {
    if (!data || saveLock.current || disabled) return;
    saveLock.current = true; setBusy(true); onBusy?.(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/project-links", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id, projectId: selected || null, expectedProjectId: data.projectId }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Não foi possível salvar.");
      setData({ ...data, projectId: result.projectId }); setNotice("Vínculo salvo. Será usado nas próximas consultas.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha de conexão. Recarregue para conferir."); }
    finally { saveLock.current = false; setBusy(false); onBusy?.(false); }
  }
  return <section className="panel workspace-form" aria-label="Projeto relacionado" aria-busy={busy}>
    <strong>Projeto relacionado</strong>
    {data ? <><label>Vincular {kind === "conversation" ? "esta conversa" : "esta memória"} a<select value={selected} disabled={disabled || busy} onChange={event => { setSelected(event.target.value); setNotice(""); }}><option value="">Sem projeto</option>{data.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
      <div className="actions"><button type="button" disabled={disabled || busy || selected === (data.projectId ?? "")} onClick={() => void save()}>{busy ? "Salvando…" : "Confirmar vínculo"}</button>{data.projectId && <Link href={`/projetos/${encodeURIComponent(data.projectId)}`}>Abrir projeto →</Link>}</div>
      <p className="muted">{kind === "conversation" ? "O projeto salvo orienta o contexto das próximas respostas e inclui esta conversa no histórico do projeto. Alterar o vínculo não move memórias nem cria tarefas automaticamente." : "O Nexus poderá recuperar esta memória nas conversas do projeto enquanto ela estiver ativa e válida. O vínculo não modifica o conteúdo nem desbloqueia o registro."}</p>
    </> : !error && <p role="status">Carregando vínculo…</p>}
    {notice && <p role="status">{notice}</p>}{error && <p role="alert">{error} <button type="button" disabled={busy || disabled} onClick={() => setRevision(value => value + 1)}>Recarregar vínculo</button></p>}
  </section>;
}
