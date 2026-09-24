"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="panel"><h1>Não foi possível carregar os objetivos</h1><button onClick={reset}>Tentar novamente</button><p><a href="/">Voltar à Home</a></p></section>;
}
