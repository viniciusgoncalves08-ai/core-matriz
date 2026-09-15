export async function readNexusResponse(body: ReadableStream<Uint8Array>, onDelta: (text: string) => void): Promise<string> {
  const reader = body.getReader(); const decoder = new TextDecoder(); let buffer = "", result: string | null = null;
  function line(value: string) {
    if (!value.trim()) return;
    const event = JSON.parse(value);
    if (event.type === "error") throw new Error(event.error);
    if (event.type === "delta" && typeof event.text === "string") onDelta(event.text);
    if (event.type === "done" && typeof event.message?.content === "string") result = event.message.content;
  }
  try {
    while (result === null) {
      const chunk = await reader.read(); buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      let end;
      while ((end = buffer.indexOf("\n")) !== -1) { line(buffer.slice(0, end)); buffer = buffer.slice(end + 1); }
      if (chunk.done) { if (buffer.trim()) line(buffer); break; }
    }
    if (result === null) throw new Error("A conexão foi interrompida. Consulte o histórico para verificar se a resposta foi salva.");
    return result;
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
