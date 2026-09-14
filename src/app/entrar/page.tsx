"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function EntrarPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    const payload = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    };

    try {
      const response = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mode === "login" ? { email: payload.email, password: payload.password } : payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Não foi possível autenticar.");
      router.replace("/");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand auth-brand"><span className="mark">N</span><div><strong>Core Matriz</strong><small>Nexus</small></div></div>
        <p className="eyebrow">ACESSO</p>
        <h1>{mode === "login" ? "Entrar" : "Criar conta"}</h1>
        <p className="muted">Acesse sua central operacional e o contexto persistente do Nexus.</p>
        <form onSubmit={submit} className="auth-form">
          {mode === "register" && <input name="name" placeholder="Seu nome" autoComplete="name" required minLength={2} />}
          <input name="email" type="email" placeholder="E-mail" autoComplete="email" required />
          <input name="password" type="password" placeholder="Senha" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={8} />
          {error && <p className="chat-error">{error}</p>}
          <button disabled={loading}>{loading ? "Processando..." : mode === "login" ? "Entrar" : "Criar conta"}</button>
        </form>
        <button className="text-button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}>
          {mode === "login" ? "Ainda não tenho conta" : "Já tenho uma conta"}
        </button>
      </section>
    </main>
  );
}
