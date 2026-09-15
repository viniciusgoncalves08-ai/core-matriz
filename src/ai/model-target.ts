export const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash-lite";

// A provider switch must not reuse a model saved for a different provider.
export function getModelTarget(preferredModel?: string | null) {
  const provider = process.env.AI_DEFAULT_PROVIDER?.trim() || "openai";
  const candidates = [preferredModel?.trim(), process.env.AI_DEFAULT_MODEL?.trim()];
  const model = provider === "gemini"
    ? candidates.find(value => value?.startsWith("gemini-")) || GEMINI_DEFAULT_MODEL
    : candidates.find(value => value && !value.startsWith("gemini-")) || "gpt-5";
  return { provider, model };
}
