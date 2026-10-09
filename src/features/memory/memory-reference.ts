export function isMemoryReferenceRequest(message: string) {
  const text = message.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[.!]+$/, "");
  return /^(?:nexus[, ]+)?(?:por favor[, ]+)?(?:pode )?(?:guarde|guardar|salve|salvar|registre|registrar) (?:isso|essa informacao|esta informacao)(?: na memoria)?$/.test(text);
}
export function usableMemoryReference(content: string) {
  const text = content.trim();
  return text.length >= 12 && text.length <= 12000 && !isMemoryReferenceRequest(text) && !/^[\/]/.test(text) && !/[?？]\s*$/.test(text);
}
