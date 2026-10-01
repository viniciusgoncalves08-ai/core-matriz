export const VOICE_KEY = "core-matriz.voice.v1";
export type VoicePreferences = { voiceURI: string; rate: number; pitch: number };
export const DEFAULT_VOICE: VoicePreferences = { voiceURI: "", rate: 1, pitch: 1 };
export function parseVoicePreferences(raw: string | null): VoicePreferences {
  try {
    const v = JSON.parse(raw ?? "null");
    return { voiceURI: typeof v?.voiceURI === "string" ? v.voiceURI.slice(0, 500) : "", rate: typeof v?.rate === "number" && v.rate >= 0.7 && v.rate <= 1.3 ? v.rate : 1, pitch: typeof v?.pitch === "number" && v.pitch >= 0.8 && v.pitch <= 1.2 ? v.pitch : 1 };
  } catch { return { ...DEFAULT_VOICE }; }
}
export function loadVoicePreferences(): VoicePreferences {
  try { return parseVoicePreferences(window.localStorage.getItem(VOICE_KEY)); } catch { return { ...DEFAULT_VOICE }; }
}
export function chooseVoice(voices: SpeechSynthesisVoice[], preferences: VoicePreferences) {
  return voices.find(v => v.voiceURI === preferences.voiceURI) ?? voices.find(v => v.lang.toLowerCase() === "pt-br") ?? voices.find(v => v.lang.toLowerCase().startsWith("pt"));
}
