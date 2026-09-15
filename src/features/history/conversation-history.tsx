"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
type Conversation = { id: string; title: string | null; updatedAt: string };
export function ConversationHistory() {
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/conversations");
      if (!response.ok) throw new Error(response.status === 401 ? "Sua sessão expirou. Entre novamente." : "Não foi possível carregar as conversas.");
      setItems((await response.json()).conversations);
    } catch (e) { setError(e instanceof Error ? e.message : "Erro inesperado."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const visible = items.filter(item => (item.title ?? "Nova conversa").toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
  return <div className="workspace-stack">
    <div className="actions"><Link className="button-link" href="/nexus">Nova conversa</Link><span className="muted">Até 50 conversas mais recentes</span></div>
    <label className="workspace-form">Buscar por título<input type="search" value={query} onChange={e => setQuery(e.target.value)} /></label>
    {loading && <p role="status">Carregando conversas…</p>}
    {error && <p className="chat-error" role="alert">{error} <a href="/entrar">Entrar</a> <button onClick={() => void load()}>Tentar novamente</button></p>}
    {!loading && !error && !visible.length && <p className="panel muted">{items.length ? "Nenhuma conversa corresponde à busca." : "Você ainda não tem conversas. Comece falando com o Nexus."}</p>}
    {visible.map(item => <Link className="panel conversation-link" href={`/historico/${item.id}`} key={item.id}><strong>{item.title ?? "Nova conversa"}</strong><small className="muted">{new Date(item.updatedAt).toLocaleString("pt-BR")}</small><span>Continuar conversa →</span></Link>)}
  </div>;
}
