"use client";
import { useEffect, useRef, useState } from "react";
import { chooseVoice, DEFAULT_VOICE, loadVoicePreferences, VOICE_KEY, type VoicePreferences } from "./voice-preferences";
export function VoiceSettings() {
  const [preferences, setPreferences] = useState<VoicePreferences>(DEFAULT_VOICE);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [supported, setSupported] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [notice, setNotice] = useState("");
  const current = useRef<SpeechSynthesisUtterance | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  function stop() { if (timeout.current) clearTimeout(timeout.current); timeout.current = null; if (current.current) { current.current.onend = current.current.onerror = null; current.current = null; window.speechSynthesis.cancel(); } setPlaying(false); }
  useEffect(() => {
    setPreferences(loadVoicePreferences());
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
    setSupported(true);
    const refresh = () => setVoices(window.speechSynthesis.getVoices());
    const hide = () => { if (document.hidden) stop(); };
    refresh(); window.speechSynthesis.addEventListener("voiceschanged", refresh); document.addEventListener("visibilitychange", hide);
    return () => { stop(); window.speechSynthesis.removeEventListener("voiceschanged", refresh); document.removeEventListener("visibilitychange", hide); };
  }, []);
  function preview() {
    stop(); setNotice("");
    if (!supported) return;
    const u = new SpeechSynthesisUtterance("Olá. Sou o Nexus. Seu resumo do dia está pronto. Vamos organizar o que merece sua atenção?");
    u.lang = "pt-BR"; u.rate = preferences.rate; u.pitch = preferences.pitch;
    const voice = chooseVoice(voices, preferences); if (voice) u.voice = voice;
    current.current = u; setPlaying(true);
    u.onend = () => stop(); u.onerror = () => { stop(); setNotice("Não foi possível reproduzir esta voz. Escolha outra ou confira o áudio do aparelho."); };
    timeout.current = setTimeout(() => { stop(); setNotice("Prévia encerrada. Se não ouviu áudio, confira o volume ou escolha outra voz."); }, 30000);
    try { window.speechSynthesis.speak(u); } catch { stop(); setNotice("Voz indisponível neste navegador."); }
  }
  const missing = preferences.voiceURI && !voices.some(v => v.voiceURI === preferences.voiceURI);
  return <section className="panel workspace-form voice-settings-panel">
    <h2>Voz do Nexus</h2>
    <p className="muted">Escolha a voz que prefere ouvir. As opções são fornecidas pelo navegador e podem variar entre celular e computador.</p>
    <label>Voz<select disabled={!supported} value={preferences.voiceURI} onChange={e => { stop(); setPreferences(p => ({ ...p, voiceURI: e.target.value })); setNotice(""); }}><option value="">Automática · português disponível</option>{missing && <option value={preferences.voiceURI}>Voz salva indisponível neste aparelho</option>}{[...voices].sort((a,b) => Number(b.lang.startsWith("pt")) - Number(a.lang.startsWith("pt")) || a.name.localeCompare(b.name)).map((v,i) => <option key={`${v.voiceURI}-${i}`} value={v.voiceURI}>{v.name} · {v.lang}</option>)}</select></label>
    {missing && <p className="muted">Será usada uma voz em português disponível até você escolher outra.</p>}
    <label>Velocidade · {preferences.rate.toFixed(1)}×<input type="range" min="0.7" max="1.3" step="0.1" value={preferences.rate} onChange={e => { stop(); setNotice(""); setPreferences(p => ({ ...p, rate: Number(e.target.value) })); }} /></label>
    <label>Tom · {preferences.pitch.toFixed(1)}<input type="range" min="0.8" max="1.2" step="0.1" value={preferences.pitch} onChange={e => { stop(); setNotice(""); setPreferences(p => ({ ...p, pitch: Number(e.target.value) })); }} /></label>
    <div className="actions"><button type="button" disabled={!supported} onClick={playing ? stop : preview}>{playing ? "Parar prévia" : "Ouvir prévia"}</button><button type="button" onClick={() => { try { localStorage.setItem(VOICE_KEY, JSON.stringify(preferences)); setNotice("Preferência salva neste navegador."); } catch { setNotice("Não foi possível salvar. Confira se o navegador permite armazenamento local."); } }}>Salvar voz</button></div>
    {!supported && <p role="status">Este navegador não oferece leitura de texto em voz.</p>}
    {supported && !voices.length && <p className="muted">O navegador ainda não informou as vozes disponíveis. A opção automática pode usar a voz padrão do sistema.</p>}
    {notice && <p role="status">{notice}</p>}
    <p className="muted">Para começar, experimente uma voz em português com velocidade 0,9×. Ajustar o tom não transforma uma voz simples em uma voz de estúdio. Uma voz neural personalizada como a referência ainda não está integrada.</p>
    <a href="/nexus">Voltar ao Nexus →</a>
  </section>;
}
