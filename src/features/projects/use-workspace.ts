"use client";
import { useCallback, useEffect, useRef, useState } from "react";
export function useWorkspace<T>(url: string, key: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const lock = useRef(false);
  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(url, { signal, cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar os dados.");
    setItems(result[key]);
  }, [url, key]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    load(controller.signal).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [load]);
  async function retry() { setLoading(true); setError(""); try { await load(); } catch (e) { setError(e instanceof Error ? e.message : "Falha ao carregar."); } finally { setLoading(false); } }
  async function save(endpoint: string, data: object, method: "POST" | "PATCH") {
    if (lock.current) return false;
    lock.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(endpoint, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar.");
      setNotice("Alterações salvas.");
      try { await load(); } catch { setError("Salvo, mas a lista não foi atualizada. Clique em Recarregar."); }
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao salvar."); return false; }
    finally { lock.current = false; setBusy(false); }
  }
  return { items, loading, busy, error, notice, retry, save };
}
