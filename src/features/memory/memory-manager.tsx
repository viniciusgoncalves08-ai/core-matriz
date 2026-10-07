"use client";

import { useEffect, useState, type FormEvent } from "react";

const categories = { FACT: "Fato", PREFERENCE: "Preferência", DECISION: "Decisão", HYPOTHESIS: "Hipótese", OBSERVED_PATTERN: "Padrão observado", CONTEXT: "Contexto", KNOWLEDGE: "Conhecimento", RESTRICTION: "Restrição", GOAL: "Objetivo" };
type Category = keyof typeof categories;
type Memory = { id: string; conversationId?: string | null; source?: string | null; content: string; summary: string | null; classification: Category; status: string; versions: { id: string; content: string; reason: string | null; createdAt: string }[] };

export function MemoryManager() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState({ q: "", classification: "", status: "" });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Category>("FACT");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setMemories([]);
    const params = new URLSearchParams({ page: String(page) });
    for (const [key, value] of Object.entries(search)) if (value) params.set(key, value);
    fetch(`/api/memories?${params}`, { signal: controller.signal, cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error(response.status === 401 ? "Sua sessão expirou. Entre novamente." : "Não foi possível carregar as memórias.");
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!data.memories.length && page > 1) { setPage(value => value - 1); return; }
      setMemories(data.memories); setTotal(data.total); setHasMore(data.hasMore);
    }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Falha na conexão."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, page, revision]);

  async function mutate(url: string, method: string, body?: object) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      if (!response.ok) throw new Error("Não foi possível salvar a alteração. Tente novamente.");
      setNotice("Alteração salva.");
      if (method === "POST" || (body && "content" in body)) { setContent(""); setEditing(null); }
      setRevision(value => value + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "Erro inesperado."); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !content.trim()) return;
    void mutate(editing ? `/api/memories/${editing}` : "/api/memories", editing ? "PATCH" : "POST", editing ? { action: "update", content, reason: "Editada pelo usuário" } : { content, classification: category, source: "Informada pelo usuário" });
  }
  return <div className="workspace-stack memory-workspace">
    <form className="panel workspace-form" onSubmit={submit}>
      <h2>{editing ? "Editar memória" : "Adicionar memória"}</h2>
      <label htmlFor="memory-content">O que o Nexus deve saber?</label>
      <textarea id="memory-content" required maxLength={12000} value={content} onChange={e => setContent(e.target.value)} disabled={busy} />
      {!editing && <><label htmlFor="memory-category">Categoria</label><select id="memory-category" value={category} onChange={e => setCategory(e.target.value as Category)}>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></>}
      <div className="actions"><button disabled={busy || !content.trim()}>{busy ? "Salvando…" : "Salvar memória"}</button>{editing && <button type="button" disabled={busy} onClick={() => { setEditing(null); setContent(""); }}>Cancelar edição</button>}</div>
    </form>
    {error && <p role="alert" className="chat-error">{error} <a href="/entrar">Entrar</a> <button disabled={busy} onClick={() => setRevision(value => value + 1)}>Tentar novamente</button></p>}
    {notice && <p role="status">{notice}</p>}
    <form className="panel workspace-form memory-search" role="search" onSubmit={event => { event.preventDefault(); setSearch({ q: query.trim(), classification: filter, status }); setPage(1); setRevision(value => value + 1); }}>
      <h2>Explorar suas memórias</h2>
      <label>Buscar por conteúdo, resumo ou origem<input type="search" maxLength={120} placeholder="Um assunto, preferência ou decisão…" value={query} onChange={e => setQuery(e.target.value)} disabled={busy} /></label>
      <div className="filters">
        <label>Categoria<select value={filter} onChange={e => setFilter(e.target.value)} disabled={busy}><option value="">Todas as categorias</option>{Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label>Situação<select value={status} onChange={e => setStatus(e.target.value)} disabled={busy}><option value="">Todas as situações</option><option value="ACTIVE">Ativas</option><option value="BLOCKED">Bloqueadas</option><option value="SUPERSEDED">Substituídas</option></select></label>
      </div>
      <p className="muted">Memórias bloqueadas e substituídas ficam fora do contexto do Nexus. Memórias excluídas não aparecem aqui.</p>
      <div className="actions"><button disabled={busy || loading}>Buscar</button><button type="button" disabled={busy || loading} onClick={() => { setQuery(""); setFilter(""); setStatus(""); setSearch({ q: "", classification: "", status: "" }); setPage(1); }}>Limpar filtros</button></div>
    </form>
    <div aria-live="polite" aria-atomic="true">{loading ? <p role="status">Carregando memórias…</p> : !error && <p className="muted">{total} memória(s) encontrada(s) · Página {page}</p>}</div>
    {!loading && !error && !memories.length && <p className="panel muted">{Object.values(search).some(Boolean) ? "Nenhuma memória corresponde aos filtros. Tente outro termo ou limpe a busca." : "Nenhuma memória salva. Adicione a primeira acima."}</p>}
    {!loading && !error && memories.map(memory => <article className="panel memory-result" key={memory.id}>
      <div className="actions"><span className="tag">{categories[memory.classification]}</span><span className="muted">{memory.status === "BLOCKED" ? "Bloqueada · fora do contexto" : memory.status === "ACTIVE" ? "Ativa" : "Substituída"}</span></div>
      <p className="preserve-text">{memory.content}</p>
      {memory.source && <p className="muted">Origem: {memory.source}</p>}
      {memory.conversationId && <a href={`/historico/${encodeURIComponent(memory.conversationId)}`}>Ver conversa de origem →</a>}
      <div className="actions">
        <button disabled={busy} onClick={() => { setEditing(memory.id); setContent(memory.content); document.getElementById("memory-content")?.focus(); }}>Editar</button>
        <button disabled={busy} onClick={() => void mutate(`/api/memories/${memory.id}`, "PATCH", { action: memory.status === "BLOCKED" ? "unblock" : "block" })}>{memory.status === "BLOCKED" ? "Desbloquear" : "Bloquear"}</button>
        <button disabled={busy} onClick={() => { if (window.confirm("Excluir esta memória? Ela deixará de ser usada pelo Nexus.")) void mutate(`/api/memories/${memory.id}`, "DELETE"); }}>Excluir</button>
      </div>
      <details><summary>Últimos registros de versão</summary>{memory.versions.map(version => <div className="version" key={version.id}><small>{new Date(version.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · {version.reason}</small><p className="preserve-text">{version.content}</p></div>)}</details>
    </article>)}
    {!error && <nav className="actions" aria-label="Páginas das memórias"><button disabled={busy || loading || page === 1} onClick={() => setPage(value => value - 1)}>← Anterior</button><button disabled={busy || loading || !hasMore} onClick={() => setPage(value => value + 1)}>Próxima →</button></nav>}
  </div>;
}
