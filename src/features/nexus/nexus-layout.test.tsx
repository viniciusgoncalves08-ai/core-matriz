import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NexusChat } from "./nexus-chat";
it("shows ready state and draft starters without claiming active audio",()=>{
 const html=renderToStaticMarkup(<NexusChat />);
 expect(html).toContain("Pronto para conversar");
 expect(html).toContain('aria-label="Começar conversa"');
 expect(html).toContain("Prazos e prioridades");
 expect(html).toContain("Voz desligada");
 expect(html).not.toContain("Ouvindo você");
});
it("keeps existing history and removes starters after a conversation begins",()=>{
 const html=renderToStaticMarkup(<NexusChat initialMessages={[{role:"user",content:"Meu plano"},{role:"assistant",content:"Resposta salva"}]} />);
 expect(html).toContain("Resposta salva");
 expect(html).not.toContain('aria-label="Começar conversa"');
});
it("links automatic captures to the exact memory",()=>{
 const html=renderToStaticMarkup(<NexusChat initialMessages={[{role:"assistant",content:"Resposta",automaticMemoryId:"m-specific"}]} />);
 expect(html).toContain('href="/memoria/m-specific"');expect(html).toContain("Revisar esta memória");
});
