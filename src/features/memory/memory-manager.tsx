"use client";

import { useEffect, useState, type FormEvent } from "react";

const categories = { FACT: "Fato", PREFERENCE: "Preferência", DECISION: "Decisão", HYPOTHESIS: "Hipótese", OBSERVED_PATTERN: "Padrão observado", CONTEXT: "Contexto", KNOWLEDGE: "Conhecimento", RESTRICTION: "Restrição", GOAL: "Objetivo" };
type Category = keyof typeof categories;
type Memory = { id: string; content: string; summary: string | null; classification: Category; status: string; versions: { id: string; content: string; reason: string | null; createdAt: string }[] };

export function MemoryManager() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Category>("FACT");

  async function reload() {
    const response = await fetch("/api/memories");
    if (!response.ok) throw new Error(response.status === 401 ? "Sua sessão expirou. Entre novamente." : "Não foi possível carregar as memórias.");
    setMemories((await response.json()).memories);
  }
  useEffect(() => { reload().catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);

  async function mutate(url: string, method: string, body?: object) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      if (!response.ok) throw new Error("Não foi possível salvar a alteração. Tente novamente.");
      setNotice("Alteração salva.");
      if (method === "POST" || (body && "content" in body)) { setContent(""); setEditing(null); }
      await reload();
    } catch (e) { setError(e instanceof Error ? e.message : "Erro inesperado."); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !content.trim()) return;
    void mutate(editing ? `/api/memories/${editing}` : "/api/memories", editing ? "PATCH" : "POST", editing ? { action: "update", content, reason: "Editada pelo usuário" } : { content, classification: category, source: "Informada pelo usuário" });
  }
  const visible = memories.filter(m => (!filter || m.classification === filter) && m.content.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
  return <div className="workspace-stack">
    <form className="panel workspace-form" onSubmit={submit}>
      <h2>{editing ? "Editar memória" : "Adicionar memória"}</h2>
      <label htmlFor="memory-content">O que o Nexus deve saber?</label>
      <textarea id="memory-content" required maxLength={12000} value={content} onChange={e => setContent(e.target.value)} disabled={busy} />
      {!editing && <><label htmlFor="memory-category">Categoria</label><select id="memory-category" value={category} onChange={e => setCategory(e.target.value as Category)}>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></>}
      <div className="actions"><button disabled={busy || !content.trim()}>{busy ? "Salvando…" : "Salvar memória"}</button>{editing && <button type="button" disabled={busy} onClick={() => { setEditing(null); setContent(""); }}>Cancelar edição</button>}</div>
    </form>
    {error && <p role="alert" className="chat-error">{error} <a href="/entrar">Entrar</a> <button disabled={busy} onClick={() => { setError(""); setLoading(true); reload().catch(e => setError(e.message)).finally(() => setLoading(false)); }}>Tentar novamente</button></p>}
    {notice && <p role="status">{notice}</p>}
    <div className="filters workspace-form"><label>Buscar memória<input type="search" value={query} onChange={e => setQuery(e.target.value)} /></label><label>Filtrar categoria<select value={filter} onChange={e => setFilter(e.target.value)}><option value="">Todas</option>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
    {loading ? <p role="status">Carregando memórias…</p> : !error && visible.length === 0 ? <p className="panel muted">{memories.length ? "Nenhuma memória corresponde à busca." : "Nenhuma memória salva. Adicione a primeira acima."}</p> : null}
    {visible.map(memory => <article className="panel" key={memory.id}>
      <div className="actions"><span className="tag">{categories[memory.classification]}</span><span className="muted">{memory.status === "BLOCKED" ? "Bloqueada · fora do contexto" : memory.status === "ACTIVE" ? "Ativa" : "Substituída"}</span></div>
      <p className="preserve-text">{memory.content}</p>
      <div className="actions">
        <button disabled={busy} onClick={() => { setEditing(memory.id); setContent(memory.content); document.getElementById("memory-content")?.focus(); }}>Editar</button>
        <button disabled={busy} onClick={() => void mutate(`/api/memories/${memory.id}`, "PATCH", { action: memory.status === "BLOCKED" ? "unblock" : "block" })}>{memory.status === "BLOCKED" ? "Desbloquear" : "Bloquear"}</button>
        <button disabled={busy} onClick={() => { if (window.confirm("Excluir esta memória? Ela deixará de ser usada pelo Nexus.")) void mutate(`/api/memories/${memory.id}`, "DELETE"); }}>Excluir</button>
      </div>
      <details><summary>Últimos registros de versão</summary>{memory.versions.map(version => <div className="version" key={version.id}><small>{new Date(version.createdAt).toLocaleString("pt-BR")} · {version.reason}</small><p className="preserve-text">{version.content}</p></div>)}</details>
    </article>)}
  </div>;
}
