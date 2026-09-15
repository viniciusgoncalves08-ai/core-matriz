"use client";

import { FormEvent, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function NexusChat({ initialConversationId = null, initialMessages = [], agentId, agentName = "Nexus" }: { agentId?: string; agentName?: string; initialConversationId?: string | null; initialMessages?: ChatMessage[] }) {
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ensureConversation(title: string) {
    if (conversationId) return conversationId;
    const response = await fetch("/api/conversations", {
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
    if (!message || loading) return;

    setInput("");
    setError(null);
    setMessages((current) => [...current, { role: "user", content: message }]);
    setLoading(true);

    try {
      const id = await ensureConversation(message);
      const response = await fetch("/api/nexus", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId: id, message, agentId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Falha ao consultar o Nexus.");
      setMessages((current) => [...current, { role: "assistant", content: data.message.content }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-wrap">
      {messages.length > 0 && (
        <div className="chat-messages">
          {messages.map((message, index) => (
            <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
              <strong>{message.role === "user" ? "Você" : agentName}</strong>
              <p>{message.content}</p>
            </div>
          ))}
        </div>
      )}
      {error && <p className="chat-error">{error}</p>}
      <form className="composer" onSubmit={submit}>
        <textarea
          aria-label={`Mensagem para ${agentName}`}
          placeholder={`Fale com ${agentName}...`}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading}>{loading ? "Pensando..." : "Enviar"}</button>
      </form>
    </div>
  );
}
