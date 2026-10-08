"use client";

import { FormEvent, useState, useRef, useEffect } from "react";

import Link from "next/link";
import { automaticMemoryId } from "@/features/memory/automatic-preference";
import { VoiceControls } from "./voice-controls";
import { ActionCards } from "@/features/actions/action-cards";
import { MessageContent } from "./message-content";
import { recallSources } from "./recall-sources";
import { readNexusResponse } from "./read-response";

type ChatMessage = { role: "user" | "assistant"; content: string; sources?: string[]; automaticMemoryId?: string };

export function NexusChat({ initialConversationId = null, initialMessages = [], agentId, agentName = "Nexus" }: { agentId?: string; agentName?: string; initialConversationId?: string | null; initialMessages?: ChatMessage[] }) {
  const abort = useRef<AbortController | null>(null);
  const lock = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const [voiceState, setVoiceState] = useState("idle");
  const [listening, setListening] = useState(false);
  const [voiceReset, setVoiceReset] = useState(0);
  const [partial, setPartial] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [autoMemory, setAutoMemory] = useState<boolean | undefined>(undefined);
  const [defaultMemory, setDefaultMemory] = useState(false);
  const [memorySettingsReady, setMemorySettingsReady] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/settings/memory", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) return;
      const data = await response.json();
      if (!controller.signal.aborted) { setDefaultMemory(data.autoMemory); setMemorySettingsReady(true); }
    }).catch(() => {});
    return () => controller.abort();
  }, []);
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
    if (!message || lock.current || listening) return;
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
        body: JSON.stringify({ conversationId: id, message, agentId, autoMemory: memorySettingsReady ? autoMemory : false, stream: true }),
        signal: abort.current.signal,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Falha ao consultar o Nexus.");
      }
      if (!response.body) throw new Error("A conexão não retornou uma resposta.");
      let sources: string[] = [];
      let capturedId: string | undefined;
      const content = await readNexusResponse(response.body, text => setPartial(current => current + text), metadata => { sources = recallSources(metadata); capturedId = automaticMemoryId(metadata); });
      setMessages(current => [...current, { role: "assistant", content, sources, automaticMemoryId: capturedId }]);
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
    <div className="chat-wrap nexus-cockpit" data-phase={loading ? "thinking" : voiceState}>
      <div className="nexus-core-stage">
        <div className="nexus-core" aria-hidden="true"><i /><i /><i /><div className="core-center">N</div></div>
        <span className="core-caption">{agentName}</span>
        <p className="core-status" role="status">{loading ? "Organizando sua resposta" : voiceState === "listening" ? "Ouvindo você" : voiceState === "speaking" ? "Falando com você" : voiceState === "starting" ? "Conectando áudio" : "Pronto para conversar"}</p>
      </div>
      {messages.length === 0 && <div className="nexus-starters" aria-label="Começar conversa">{[["Seu dia", "resumo do dia", "Prazos e prioridades"], ["Sua memória", "O que você sabe sobre mim?", "Contexto que acompanha você"], ["Próximo passo", "Me ajude a organizar meus projetos", "Transforme ideias em direção"]].map(([title, prompt, description]) => <button type="button" disabled={loading || listening} key={title} onClick={() => setInput(prompt)}><span>{title}</span><small>{description}</small><b aria-hidden="true">↗</b></button>)}</div>}
      <div className="actions"><Link href={agentId ? `/agentes/${agentId}` : "/nexus"} onClick={event => { if (loading) { event.preventDefault(); return; } setVoiceReset(v => v + 1); setAutoMemory(undefined); setConversationId(null); setMessages([]); setPartial(""); setError(null); setInput(""); }}>Nova conversa</Link><Link href="/historico">Histórico</Link></div>
      {!agentId && <div className="panel auto-memory-option"><label><input type="checkbox" checked={autoMemory ?? defaultMemory} disabled={loading || !memorySettingsReady} onChange={event => setAutoMemory(event.target.checked)} /> Salvar preferências explícitas automaticamente nesta conversa</label><p className="muted">Primeira versão: frases curtas como “prefiro respostas objetivas”. Ative para salvar após a resposta, sem confirmação por item. Você pode revisar, bloquear ou excluir em Memória. O padrão vem da sua conta; alterações aqui valem só nesta conversa.</p><Link href="/configuracoes">Configurar padrão da conta →</Link>{!memorySettingsReady && <p className="muted">Captura desativada até carregar a configuração. Se persistir, recarregue a página.</p>}</div>}
      {messages.length > 0 && (
        <div className="chat-messages">
          {messages.map((message, index) => (
            <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
              <strong>{message.role === "user" ? "Você" : agentName}</strong>
              {message.role === "assistant" ? <MessageContent content={message.content} /> : <p>{message.content}</p>}
              {message.role === "assistant" && message.automaticMemoryId && <p className="muted">Uma preferência foi salva automaticamente nesta resposta. <Link href={`/memoria/${encodeURIComponent(message.automaticMemoryId)}`}>Revisar esta memória →</Link></p>}
              {message.role === "assistant" && Boolean(message.sources?.length) && <details><summary>Conversas encontradas no histórico</summary><div className="actions">{message.sources!.map((id, index) => <Link key={id} href={`/historico/${encodeURIComponent(id)}`}>Conversa {index + 1}</Link>)}</div></details>}
            </div>
          ))}
          {partial && <div className="chat-message assistant"><strong>{agentName}</strong><MessageContent content={partial} /><small>{loading ? "Recebendo…" : "Trecho parcial — confira o histórico"}</small></div>}
          <div ref={endRef} />
        </div>
      )}
      {conversationId && <ActionCards key={conversationId} conversationId={conversationId} refresh={messages.length} />}
      {error && <p role="alert" className="chat-error">{error}</p>}
      {loading && <div className="actions" role="status"><span className="muted">{partial ? "Recebendo resposta…" : "Preparando resposta…"}</span><button type="button" onClick={() => abort.current?.abort()}>Interromper</button></div>}
      <details className="nexus-command-help"><summary>O que posso pedir ao Nexus?</summary><p className="muted action-hint">Para consultar, envie <code>minhas tarefas</code>, <code>tarefas atrasadas</code> ou <code>tarefas sem prazo</code>. Para propor uma tarefa, envie: <code>crie uma tarefa: ligar para o fornecedor</code>. Para editar ou concluir uma tarefa: <code>edite a tarefa: título completo</code>. Para projetos: <code>crie um projeto: expansão da loja</code>. Para editar: <code>edite o projeto: nome completo</code>. Para consultar a memória: <code>liste minhas memórias</code>. Para guardar: <code>guarde que prefiro ler à noite</code>. Você revisa e confirma antes de salvar.</p></details>
      <VoiceControls onState={setVoiceState} draft={input} onDraft={setInput} onListening={setListening} response={[...messages].reverse().find(m => m.role === "assistant")?.content ?? ""} busy={loading} resetKey={voiceReset} />
      <form className="composer" onSubmit={submit}>
        <textarea
          aria-label={`Mensagem para ${agentName}`}
          placeholder={`Fale com ${agentName}...`}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={loading || listening}
          maxLength={12000}
        />
        <button type="submit" disabled={loading || listening || !input.trim()}>{loading ? "Respondendo…" : "Enviar"}</button>
      </form>
    </div>
  );
}
