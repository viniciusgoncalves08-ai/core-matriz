export function spokenText(text: string) {
  return text.replace(/```[\s\S]*?```/g, " Bloco de código disponível na tela. ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " link disponível na tela ")
    .replace(/[#*_`>|~]/g, " ").replace(/\s+/g, " ").trim().slice(0, 6000);
}
export function appendDictation(draft: string, transcript: string) {
  return [draft.trimEnd(), transcript.trim()].filter(Boolean).join(" ").slice(0, 12000);
}
export function recognitionError(code: string) {
  if (["not-allowed", "service-not-allowed"].includes(code)) return "O microfone não foi autorizado. Confira a permissão do navegador ou continue digitando.";
  if (code === "no-speech") return "Não foi possível identificar fala. Tente novamente ou digite sua mensagem.";
  if (code === "audio-capture") return "Microfone indisponível. Confira se outro aplicativo está usando o áudio.";
  return "Não foi possível transcrever. Confira a conexão ou continue digitando.";
}
