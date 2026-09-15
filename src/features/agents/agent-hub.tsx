"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
type Agent = { id: string; name: string; description: string; role: string; systemPrompt: string; preferredModel: string | null; temperature: number; status: "ACTIVE" | "PAUSED" | "DISABLED"; slug: string };
const empty = { name: "", description: "", role: "", systemPrompt: "", preferredModel: "", temperature: 0.2 };
export function AgentHub() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load() {
    const response = await fetch("/api/agents");
    if (!response.ok) throw new Error(response.status === 401 ? "Sua sessão expirou. Entre novamente." : "Não foi possível carregar os agentes.");
    setAgents((await response.json()).agents);
  }
  useEffect(() => { load().catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  async function save(id: string | null, data: object, close = false) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(id ? `/api/agents/${id}` : "/api/agents", { method: id ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar.");
      if (close) { setOpen(false); setEditing(null); setForm(empty); }
      setNotice("Agente salvo.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Erro inesperado."); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); if (!busy) void save(editing, form, true); }
  function edit(agent: Agent) {
    setEditing(agent.id); setForm({ name: agent.name, description: agent.description || "", role: agent.role, systemPrompt: agent.systemPrompt, preferredModel: agent.preferredModel || "", temperature: agent.temperature }); setOpen(true);
  }
  return <div className="workspace-stack">
    <div className="actions"><button disabled={busy} onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}>+ Criar agente</button><span className="muted">Os agentes usam suas memórias e o histórico da conversa.</span></div>
    {error && <p role="alert" className="chat-error">{error} <button disabled={busy} onClick={() => { setError(""); setLoading(true); load().catch(e => setError(e.message)).finally(() => setLoading(false)); }}>Tentar novamente</button> <a href="/entrar">Entrar</a></p>}
    {notice && <p role="status">{notice}</p>}
    {open && <form className="panel workspace-form" onSubmit={submit}>
      <h2>{editing ? "Editar agente" : "Novo especialista"}</h2>
      <label>Nome<input required minLength={2} maxLength={80} value={form.name} disabled={busy} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
      <label>Descrição<input maxLength={500} value={form.description} disabled={busy} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
      <label>Especialidade<input required minLength={2} maxLength={300} placeholder="Ex.: Planejamento de projetos" value={form.role} disabled={busy} onChange={e => setForm({ ...form, role: e.target.value })} /></label>
      <label>Instruções<textarea required maxLength={20000} placeholder="Como este agente deve ajudar você?" value={form.systemPrompt} disabled={busy} onChange={e => setForm({ ...form, systemPrompt: e.target.value })} /></label>
      <details><summary>Configurações avançadas</summary><label>Modelo (vazio usa o padrão do aplicativo)<input maxLength={120} value={form.preferredModel} disabled={busy} onChange={e => setForm({ ...form, preferredModel: e.target.value })} /></label><p className="muted">Modelos de raciocínio usam seus parâmetros padrão e podem ignorar a temperatura.</p><label>Temperatura: {form.temperature}<input type="range" min="0" max="2" step="0.1" value={form.temperature} disabled={busy} onChange={e => setForm({ ...form, temperature: Number(e.target.value) })} /></label></details>
      <div className="actions"><button disabled={busy}>{busy ? "Salvando…" : "Salvar agente"}</button><button type="button" disabled={busy} onClick={() => setOpen(false)}>Cancelar</button></div>
    </form>}
    {loading && <p role="status">Carregando agentes…</p>}
    {!loading && !error && !agents.length && <p className="panel muted">Você ainda não tem agentes. Crie seu primeiro especialista acima.</p>}
    <div className="agent-grid">{agents.map(agent => <article className="panel" key={agent.id}>
      <span className="tag">{agent.slug === "nexus" ? "Agente central" : "Especialista"}</span><h2>{agent.name}</h2><p className="muted">{agent.role}</p><p className="preserve-text">{agent.description}</p>
      <p className="muted">{agent.status === "ACTIVE" ? "Ativo" : agent.status === "PAUSED" ? "Pausado" : "Desativado"}</p>
      <div className="actions">{agent.status === "ACTIVE" && <Link className="button-link" href={`/agentes/${agent.id}`}>Conversar</Link>}<button disabled={busy} onClick={() => edit(agent)}>Editar</button><button disabled={busy} onClick={() => void save(agent.id, { status: agent.status === "ACTIVE" ? "PAUSED" : "ACTIVE" })}>{agent.status === "ACTIVE" ? "Pausar" : "Ativar"}</button></div>
    </article>)}</div>
    <p className="muted">Nesta etapa, você escolhe o agente. As respostas dependem da conexão de IA configurada; os agentes ainda não executam ações externas.</p>
  </div>;
}
