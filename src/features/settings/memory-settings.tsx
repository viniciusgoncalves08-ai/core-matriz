"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
export function MemorySettings() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setReady(false); setError("");
    fetch("/api/settings/memory", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error(response.status === 401 ? "Entre na sua conta para configurar a memória." : "Não foi possível carregar a configuração.");
      const data = await response.json(); if (!controller.signal.aborted) { setEnabled(data.autoMemory); setReady(true); }
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  async function save() {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/settings/memory", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ autoMemory: enabled }) });
      if (!response.ok) throw new Error("Não foi possível salvar. Tente novamente.");
      setNotice("Configuração salva na sua conta.");
    } catch (e) { setError(e instanceof Error ? e.message : "Falha na conexão."); }
    finally { setBusy(false); }
  }
  return <section className="panel auto-memory-option workspace-form">
    <h2>Memória do Nexus</h2>
    <p className="muted">Defina o padrão da sua conta, disponível também em outros dispositivos. No chat, você pode alterar a captura apenas para aquela conversa.</p>
    {loading ? <p role="status">Carregando configuração…</p> : <label><input type="checkbox" checked={enabled} disabled={busy} onChange={e => { setEnabled(e.target.checked); setNotice(""); }} /> Capturar preferências explícitas por padrão</label>}
    <p className="muted">Reconhece frases curtas como “prefiro respostas objetivas”. Não interpreta toda a conversa. Desativar não exclui memórias já salvas; revise, bloqueie ou exclua em Memória.</p>
    <div className="actions"><button disabled={loading || busy || !ready} onClick={() => void save()}>{busy ? "Salvando…" : "Salvar configuração"}</button><Link href="/memoria">Revisar memórias</Link></div>
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert">{error} <Link href="/entrar">Entrar</Link> <button disabled={busy} onClick={() => setRevision(value => value + 1)}>Recarregar</button></p>}
  </section>;
}
