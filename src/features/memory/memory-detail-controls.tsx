"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
export function MemoryDetailControls({ id, content, status }: { id: string; content: string; status: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState(content);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function save(method: "PATCH" | "DELETE", body?: object) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/memories/${encodeURIComponent(id)}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      if (!response.ok) throw new Error("Não foi possível salvar a alteração. Recarregue e tente novamente.");
      setEditing(false); setNotice(method === "DELETE" ? "Memória excluída." : "Alteração salva."); router.refresh();
    } catch(e) { setError(e instanceof Error ? e.message : "Falha na conexão."); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); if (draft.trim()) void save("PATCH", { action: "update", content: draft, reason: "Revisão pelo usuário na página da memória" }); }
  return <div className="workspace-stack">
    {editing && <form className="workspace-form" onSubmit={submit}><label>Corrigir conteúdo<textarea value={draft} onChange={e => setDraft(e.target.value)} maxLength={12000} required disabled={busy} /></label><div className="actions"><button disabled={busy || !draft.trim()}>Salvar correção</button><button type="button" disabled={busy} onClick={() => setEditing(false)}>Cancelar</button></div></form>}
    <div className="actions">
      <button disabled={busy} onClick={() => { setDraft(content); setEditing(true); }}>Editar</button>
      {(status === "ACTIVE" || status === "BLOCKED") && <button disabled={busy} onClick={() => void save("PATCH", { action: status === "BLOCKED" ? "unblock" : "block" })}>{status === "BLOCKED" ? "Desbloquear" : "Bloquear uso"}</button>}
      <button disabled={busy} onClick={() => { if (window.confirm("Excluir esta memória? Ela deixará de ser usada pelo Nexus. A conversa de origem será mantida.")) void save("DELETE"); }}>Excluir memória</button>
    </div>
    {busy && <p role="status">Salvando…</p>}{notice && <p role="status">{notice}</p>}{error && <p role="alert" className="chat-error">{error}</p>}
  </div>;
}
