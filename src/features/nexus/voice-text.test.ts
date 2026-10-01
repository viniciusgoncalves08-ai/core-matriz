import { expect, it } from "vitest";
import { appendDictation, spokenText, recognitionError } from "./voice-text";
it("preserves typed draft and limits dictated input",()=>{
 expect(appendDictation("Bom dia", " Nexus ")).toBe("Bom dia Nexus");
 expect(appendDictation("x".repeat(12000),"extra")).toHaveLength(12000);
});
it("reads link labels, omits code and limits lengthy answers",()=>{
 const text=spokenText("# Resumo\n[Projetos](/projetos)\n```js\nalert('secret')\n```");
 expect(text).toContain("Projetos");expect(text).not.toContain("alert");expect(text).not.toContain("/projetos");
 expect(spokenText("a".repeat(7000))).toHaveLength(6000);
});
it("explains denied microphone and unavailable capture",()=>{
 expect(recognitionError("not-allowed")).toContain("não foi autorizado");
 expect(recognitionError("audio-capture")).toContain("Microfone indisponível");
});

import { parseVoicePreferences, chooseVoice } from "./voice-preferences";
it("validates saved voice settings and falls back when a selected voice disappeared",()=>{
 expect(parseVoicePreferences('{"rate":99,"pitch":-1}')).toMatchObject({rate:1,pitch:1});
 expect(parseVoicePreferences('broken')).toMatchObject({voiceURI:"",rate:1});
 const voices=[{voiceURI:"br",lang:"pt-BR"},{voiceURI:"en",lang:"en-US"}] as SpeechSynthesisVoice[];
 expect(chooseVoice(voices,{voiceURI:"missing",rate:1,pitch:1})?.voiceURI).toBe("br");
 expect(chooseVoice(voices,{voiceURI:"en",rate:1,pitch:1})?.voiceURI).toBe("en");
});
