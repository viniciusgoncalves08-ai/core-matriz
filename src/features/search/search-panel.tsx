"use client";
import { type FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SearchResult } from "./search-service";
const labels:Record<string,string>={all:"Tudo",tasks:"Tarefas",projects:"Projetos",goals:"Objetivos",memories:"Memórias",conversations:"Conversas"};
export function SearchPanel(){
 const [q,setQ]=useState("");const [kind,setKind]=useState("all");
 const [data,setData]=useState<{q:string;results:SearchResult[];limited:boolean}|null>(null);
 const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 const request=useRef<AbortController|null>(null);
 useEffect(()=>()=>request.current?.abort(),[]);
 async function search(event:FormEvent){
  event.preventDefault();request.current?.abort();const controller=new AbortController();request.current=controller;
  setBusy(true);setError("");setData(null);
  try{const response=await fetch(`/api/search?${new URLSearchParams({q,kind})}`,{cache:"no-store",signal:controller.signal});const result=await response.json();if(!response.ok)throw new Error(result.error);if(!controller.signal.aborted)setData(result);}
  catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Falha na busca.");}
  finally{if(!controller.signal.aborted)setBusy(false);}
 }
 return <section className="panel" aria-busy={busy}><form onSubmit={search} className="workspace-stack">
  <label>O que você procura?<input value={q} onChange={e=>setQ(e.target.value)} minLength={2} maxLength={120} required placeholder="Nome, assunto ou trecho de texto"/></label>
  <label>Pesquisar em<select value={kind} onChange={e=>setKind(e.target.value)}>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
  <button disabled={busy} type="submit">{busy?"Pesquisando…":"Pesquisar"}</button></form>
  {error&&<p role="alert">{error}</p>}
  {data&&<div className="workspace-stack"><p role="status">{data.results.length} resultado(s) exibido(s) para “{data.q}”.</p>{data.results.length === 0 && <p>Nenhum resultado encontrado. Experimente outro trecho ou selecione Tudo.</p>}{data.results.map(r=><article className="panel" key={`${r.kind}:${r.id}`}><small>{labels[r.kind]}</small><h2><Link href={r.href}>{r.title}</Link></h2><p>{r.excerpt}</p>{["tasks","goals"].includes(r.kind)&&<small>Abre a lista de {labels[r.kind].toLowerCase()}.</small>}</article>)}{data.limited&&<p>Há mais resultados. Refine o texto; mostramos até 10 por categoria.</p>}</div>}
  <p className="muted">Busca textual em títulos, descrições, memórias ativas e válidas e mensagens. Memórias bloqueadas ou excluídas não entram; o texto original pode continuar no histórico de conversas.</p>
 </section>;
}
