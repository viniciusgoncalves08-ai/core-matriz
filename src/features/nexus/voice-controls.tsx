"use client";
import { useEffect, useRef, useState } from "react";
import { appendDictation, recognitionError, spokenText } from "./voice-text";
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onstart: (() => void) | null; onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  start(): void; stop(): void; abort(): void;
};
type VoiceWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
export function VoiceControls({ draft, onDraft, onListening, response, busy, resetKey, onState }: { draft: string; onDraft: (text: string) => void; onListening: (active: boolean) => void; response: string; busy: boolean; resetKey: number; onState?: (state: string) => void }) {
  const [available, setAvailable] = useState({ recognition: false, speech: false });
  const [state, setState] = useState<"idle" | "starting" | "listening" | "speaking">("idle");
  const [transcript, setTranscript] = useState("");
  const heard = useRef("");
  const [error, setError] = useState("");
  const recognition = useRef<Recognition | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbacks = useRef({ onDraft, onListening });
  callbacks.current = { onDraft, onListening };
  useEffect(() => { onState?.(state); }, [state, onState]);
  function stop() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const r = recognition.current; recognition.current = null;
    if (r) { r.onstart = r.onend = r.onerror = r.onresult = null; r.abort(); }
    if (utterance.current) { utterance.current.onend = utterance.current.onerror = utterance.current.onstart = null; utterance.current = null; window.speechSynthesis.cancel(); }
    callbacks.current.onListening(false); setState("idle");
  }
  useEffect(() => {
    const w = window as VoiceWindow;
    setAvailable({ recognition: Boolean(w.SpeechRecognition || w.webkitSpeechRecognition), speech: "speechSynthesis" in window && "SpeechSynthesisUtterance" in window });
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", hide);
    return () => { stop(); document.removeEventListener("visibilitychange", hide); };
  }, []);
  useEffect(() => { stop(); }, [resetKey, busy]);
  function listen() {
    if (busy || recognition.current) return;
    stop(); setError(""); setTranscript(""); heard.current = "";
    const Constructor = (window as VoiceWindow).SpeechRecognition || (window as VoiceWindow).webkitSpeechRecognition;
    if (!Constructor) return;
    const r = new Constructor(); recognition.current = r;
    r.lang = "pt-BR"; r.continuous = false; r.interimResults = true;
    callbacks.current.onListening(true); setState("starting");
    r.onstart = () => setState("listening");
    const finish = () => {
      const text = heard.current.trim();
      if (text) { callbacks.current.onDraft(appendDictation(draft, text)); setTranscript(""); }
      else setError("A escuta terminou sem reconhecer palavras. Abra o site diretamente no Chrome, confira a permissão do microfone e tente novamente. Você também pode usar o microfone do teclado.");
      stop();
    };
    r.onresult = event => {
      heard.current = Array.from(event.results).map(result => result[0].transcript).join(" ");
      setTranscript(heard.current);
      if (Array.from(event.results).every(result => result.isFinal)) finish();
    };
    r.onerror = event => { setError(recognitionError(event.error)); stop(); };
    r.onend = finish;
    timer.current = setTimeout(finish, 30000);
    try { r.start(); } catch { stop(); setError("Não foi possível iniciar o microfone. Continue digitando."); }
  }
  function speak() {
    if (busy || !response || !available.speech) return;
    stop(); setError("");
    const text = spokenText(response);
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text); utterance.current = u;
    u.lang = "pt-BR";
    const voice = window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase() === "pt-br");
    if (voice) u.voice = voice;
    setState("starting");
    u.onstart = () => setState("speaking");
    u.onend = () => stop();
    u.onerror = () => { stop(); setError("Não foi possível reproduzir a voz. A resposta continua disponível em texto."); };
    timer.current = setTimeout(() => { stop(); setError("Leitura encerrada. Você pode continuar pela resposta em texto."); }, 180000);
    try { window.speechSynthesis.speak(u); } catch { stop(); setError("Voz indisponível neste navegador."); }
  }
  return <section className="voice-controls" aria-label="Controles de voz">
    <div className="actions"><button type="button" disabled={busy || !available.recognition || state !== "idle"} onClick={listen}>Ditar mensagem</button><button type="button" disabled={busy || !available.speech || !response || state !== "idle"} onClick={speak}>Ouvir última resposta</button>{state !== "idle" && <button type="button" onClick={() => { if (recognition.current) recognition.current.stop(); else stop(); }}>Concluir / parar voz</button>}</div>
    <p role="status" className="muted">{state === "listening" ? "Ouvindo…" : state === "speaking" ? "Lendo resposta…" : state === "starting" ? "Iniciando áudio…" : "Voz desligada. Revise o texto ditado e toque em Enviar."}</p>
    {transcript && <p className="voice-transcript" role="status">Estou entendendo: {transcript}</p>}
    {!available.recognition && <p className="muted">Ditado indisponível neste navegador. Você pode usar o microfone do teclado.</p>}
    {!available.speech && <p className="muted">Leitura em voz indisponível neste navegador.</p>}
    <details className="voice-help"><summary>Microfone e privacidade</summary><p>Se não ouvir você, abra este endereço diretamente no Chrome, permita o microfone nas configurações do site e confira se outro aplicativo está usando o áudio. Navegadores dentro de outros aplicativos podem não oferecer ditado.</p><small className="muted">O navegador pode enviar áudio ao serviço de reconhecimento dele. O Core Matriz recebe o texto quando você envia. Leitura limitada a 6.000 caracteres.</small></details>
    {error && <p role="alert" className="chat-error">{error}</p>}
  </section>;
}
