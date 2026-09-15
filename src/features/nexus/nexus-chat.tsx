"use client";

import { FormEvent, useState, useRef, useEffect } from "react";

import Link from "next/link";
import { MessageContent } from "./message-content";
import { readNexusResponse } from "./read-response";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function NexusChat({ initialConversationId = null, initialMessages = [], agentId, agentName = "Nexus" }: { agentId?: string; agentName?: string; initialConversationId?: string | null; initialMessages?: ChatMessage[] }) {
  const abort = useRef<AbortController | null>(null);
  const lock = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const [partial, setPartial] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [messages, partial]);

  async function ensureConversation(title: string) {
    if (conversationId) return conversationId;
    const response = await fetch("/api/conversations", {
      signal: abort.current?.signal,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: title.slice(0, 120) }),
    });
    if (!response.ok) throw new Error(response.status === 401 ? "Faça login para conversar com o Nexus." : "Não foi possível criar a conversa.");
    const data = await response.json();
    setConversationId(data.conversation.id);
    window.history.replaceState(null, "", `/historico/${data.conversation.id}`);
    return data.conversation.id as string;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || lock.current) return;
    lock.current = true;
    abort.current = new AbortController();
    setPartial("");

    setInput("");
    setError(null);
    setMessages((current) => [...current, { role: "user", content: message }]);
    setLoading(true);

    try {
      const id = await ensureConversation(message);
      const response = await fetch("/api/nexus", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId: id, message, agentId, stream: true }),
        signal: abort.current.signal,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Falha ao consultar o Nexus.");
      }
      if (!response.body) throw new Error("A conexão não retornou uma resposta.");
      const content = await readNexusResponse(response.body, text => setPartial(current => current + text));
      setMessages(current => [...current, { role: "assistant", content }]);
      setPartial("");
    } catch (cause) {
      setError(abort.current?.signal.aborted ? "Transmissão interrompida. Consulte o histórico para verificar o que foi salvo." : cause instanceof Error ? cause.message : "Erro inesperado");
      setInput(message);
    } finally {
      lock.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="chat-wrap">
      <div className="actions"><Link href={agentId ? `/agentes/${agentId}` : "/nexus"} onClick={event => { if (loading) { event.preventDefault(); return; } setConversationId(null); setMessages([]); setPartial(""); setError(null); setInput(""); }}>Nova conversa</Link><Link href="/historico">Histórico</Link></div>
      {messages.length > 0 && (
        <div className="chat-messages">
          {messages.map((message, index) => (
            <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
              <strong>{message.role === "user" ? "Você" : agentName}</strong>
              {message.role === "assistant" ? <MessageContent content={message.content} /> : <p>{message.content}</p>}
            </div>
          ))}
          {partial && <div className="chat-message assistant"><strong>{agentName}</strong><MessageContent content={partial} /><small>{loading ? "Recebendo…" : "Trecho parcial — confira o histórico"}</small></div>}
          <div ref={endRef} />
        </div>
      )}
      {error && <p role="alert" className="chat-error">{error}</p>}
      {loading && <div className="actions" role="status"><span className="muted">{partial ? "Recebendo resposta…" : "Preparando resposta…"}</span><button type="button" onClick={() => abort.current?.abort()}>Interromper</button></div>}
      <form className="composer" onSubmit={submit}>
        <textarea
          aria-label={`Mensagem para ${agentName}`}
          placeholder={`Fale com ${agentName}...`}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={loading}
          maxLength={12000}
        />
        <button type="submit" disabled={loading || !input.trim()}>{loading ? "Respondendo…" : "Enviar"}</button>
      </form>
    </div>
  );
}
