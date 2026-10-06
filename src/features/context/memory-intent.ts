// Only standalone profile requests broaden retrieval. A named topic keeps its filter.
export function isMemoryProfileRequest(message: string): boolean {
  const text = message.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .trim().replace(/[?.!]+$/, "").trim()
    .replace(/^nexus[, ]+/, "").replace(/^por favor[, ]+/, "");
  return /^(?:(?:me (?:conte|diga|fale|mostre)|(?:quero|gostaria de) saber)\s+)?o que (?:voce )?(?:sabe|lembra|tem (?:salvo|guardado|registrado)) (?:sobre|de) mim$/u.test(text)
    || /^(?:(?:mostre|liste|exiba)(?: para mim)?\s+)?(?:as )?minhas memorias(?: salvas)?$/u.test(text);
}
