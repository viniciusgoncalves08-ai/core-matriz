"use client";
export default function MemoryError({ reset }: { reset: () => void }) { return <section className="panel"><h2>Não foi possível abrir a memória</h2><p role="alert">Tente novamente em instantes.</p><button onClick={reset}>Tentar novamente</button></section>; }
