"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
type Conversation = { id: string; title: string | null; updatedAt: string };
export function ConversationHistory() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true); setError(""); setItems([]);
    fetch(`/api/conversations?${new URLSearchParams({ q: query, page: String(page) })}`, { signal: abort.signal, cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error(response.status === 401 ? "Sua sessão expirou. Entre novamente." : "Não foi possível carregar as conversas.");
      const data = await response.json();
      if (!abort.signal.aborted) { setItems(data.conversations); setTotal(data.total); setHasMore(data.hasMore); }
    }).catch(cause => { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : "Falha na conexão."); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [query, page, revision]);
  return <div className="workspace-stack history-workspace">
    <div className="actions"><Link className="button-link" href="/nexus">+ Nova conversa</Link><span className="muted">Seu histórico, pesquisável</span></div>
    <form className="panel workspace-form history-search" role="search" onSubmit={event => { event.preventDefault(); setQuery(draft.trim()); setPage(1); setRevision(value => value + 1); }}>
      <label>Encontrar uma conversa<input type="search" maxLength={120} placeholder="Busque um assunto, projeto ou frase…" value={draft} onChange={event => setDraft(event.target.value)} /></label>
      <p className="muted">Pesquisa nos títulos e nas mensagens de todas as suas conversas.</p>
      <div className="actions"><button type="submit" disabled={loading}>Buscar</button>{(query || draft) && <button type="button" onClick={() => { setDraft(""); setQuery(""); setPage(1); }}>Limpar busca</button>}</div>
    </form>
    <div aria-live="polite" aria-atomic="true">
      {loading ? <p role="status">Buscando conversas…</p> : !error && <p className="muted">{total} conversa(s){query ? ` para “${query}”` : " no histórico"} · Página {page}</p>}
    </div>
    {error && <div className="chat-error" role="alert">{error} <Link href="/entrar">Entrar</Link> <button onClick={() => setRevision(value => value + 1)}>Tentar novamente</button></div>}
    {!loading && !error && !items.length && <div className="panel"><h2>{query ? "Nenhuma conversa encontrada" : "Seu histórico começa aqui"}</h2><p className="muted">{query ? "Tente outra palavra ou uma frase mais curta." : page > 1 ? "Não há conversas nesta página. Volte à página anterior." : "Converse com o Nexus para registrar ideias e retomar seus assuntos depois."}</p></div>}
    {!loading && !error && <div className="history-results">{items.map(item => <Link className="panel conversation-link" href={`/historico/${item.id}`} key={item.id}><strong>{item.title ?? "Nova conversa"}</strong><time className="muted" dateTime={item.updatedAt}>{new Date(item.updatedAt).toLocaleString("pt-BR", {timeZone:"America/Sao_Paulo"})} · Brasília</time><span>Retomar conversa →</span></Link>)}</div>}
    {!error && <nav className="actions history-pagination" aria-label="Páginas do histórico"><button disabled={loading || page === 1} onClick={() => setPage(value => value - 1)}>← Anterior</button><button disabled={loading || !hasMore} onClick={() => setPage(value => value + 1)}>Próxima →</button></nav>}
  </div>;
}
