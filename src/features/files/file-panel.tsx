"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MAX_FILE_BYTES } from "./file-limits";
type Row = { id: string; name: string; size: number; pageCount: number; conversationId: string };
export function FilePanel({ conversationId, projectId, ensureConversation, disabled = false, onBusy }: {
  conversationId?: string | null; projectId?: string; ensureConversation?: (title: string) => Promise<string>; disabled?: boolean; onBusy?: (busy: boolean) => void;
}) {
  const [files, setFiles] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const lock = useRef(false);
  const revision = useRef(0);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); const current = ++revision.current;
    setFiles([]); setError(""); setDeleting(null);
    if (!conversationId && !projectId) setNotice("");
    if (conversationId || projectId) {
      const query = new URLSearchParams(conversationId ? { conversationId } : { projectId: projectId! });
      fetch(`/api/files?${query}`, { cache: "no-store", signal: controller.signal }).then(async response => {
        const data = await response.json(); if (!response.ok) throw new Error(data.error);
        if (current === revision.current && !controller.signal.aborted) setFiles(data.files);
      }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Falha ao carregar arquivos."); });
    }
    return () => controller.abort();
  }, [conversationId, projectId, refresh]);
  async function upload(file: File) {
    if (lock.current || disabled || !ensureConversation) return;
    if (!file.size || file.size > MAX_FILE_BYTES) { setError("Escolha um arquivo de até 1 MB, com conteúdo."); return; }
    lock.current = true; setBusy(true); onBusy?.(true); setError(""); setNotice("");
    try {
      const id = conversationId || await ensureConversation(`Arquivo: ${file.name}`);
      const response = await fetch(`/api/files?conversationId=${encodeURIComponent(id)}`, { method: "POST", headers: { "Content-Type": "application/octet-stream", "X-File-Name": encodeURIComponent(file.name) }, body: file });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setRefresh(value => value + 1); setNotice("Arquivo salvo. Você já pode perguntar sobre ele.");
    } catch (e) { setError(e instanceof Error ? e.message : "Falha no envio. Atualize a lista para conferir."); }
    finally { lock.current = false; setBusy(false); onBusy?.(false); }
  }
  async function remove(id: string) {
    if (lock.current || disabled) return;
    lock.current = true; setBusy(true); onBusy?.(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/files/${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      ++revision.current; setFiles(rows => rows.filter(r => r.id !== id)); setDeleting(null);
      setNotice("Arquivo excluído do armazenamento e das próximas consultas. Respostas já salvas continuam no histórico.");
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao excluir."); }
    finally { lock.current = false; setBusy(false); onBusy?.(false); }
  }
  return <section className="panel workspace-stack" aria-label="Arquivos" aria-busy={busy}>
    <h2>Arquivos {projectId ? "do projeto" : "da conversa"}</h2>
    {ensureConversation && <label>Anexar arquivo<input type="file" accept=".pdf,.txt,.md" disabled={busy || disabled} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} /></label>}
    <p className="muted">PDF com texto, TXT ou Markdown em UTF-8. Até 1 MB e 100 mil caracteres; PDF até 30 páginas. Limite de 5 arquivos por conversa e 20 por conta. O Nexus consulta trechos, não necessariamente o documento inteiro. Arquivos de conversas vinculadas também entram no contexto do projeto.</p>
    {projectId && <Link href={`/nexus?projectId=${encodeURIComponent(projectId)}`}>Abrir conversa para anexar arquivos →</Link>}
    {files.map(file => <article key={file.id}><Link href={`/arquivos/${encodeURIComponent(file.id)}`}>{file.name}</Link><small> · {Math.ceil(file.size / 1024)} KB · {file.pageCount} página(s)</small>
      {ensureConversation && (deleting === file.id ? <div className="actions"><span>Excluir o original e o texto extraído? Respostas anteriores permanecem.</span><button type="button" disabled={busy || disabled} onClick={() => void remove(file.id)}>Confirmar exclusão</button><button type="button" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button></div> : <button type="button" disabled={busy || disabled} onClick={() => setDeleting(file.id)}>Excluir</button>)}
    </article>)}
    {!files.length && <p className="muted">Nenhum arquivo carregado nesta lista.</p>}
    <button type="button" disabled={busy || disabled} onClick={() => setRefresh(value => value + 1)}>Atualizar lista</button>
    {busy && <p role="status">Processando arquivo…</p>}{notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}
  </section>;
}
