"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { getDeadlineAlerts } from "./alert-service";
type Data = Awaited<ReturnType<typeof getDeadlineAlerts>>;
export function AlertsPanel({ compact = false }: { compact?: boolean }) {
  const [data,setData]=useState<Data|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState<string|null>(null);
  const [showRead,setShowRead]=useState(false);
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    const controller=new AbortController(); setLoading(true); setError("");
    fetch("/api/alerts",{cache:"no-store",signal:controller.signal}).then(async response=>{
      const result=await response.json(); if(!response.ok) throw new Error(result.error); setData(result);
    }).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Não foi possível carregar.");}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[revision]);
  async function mark(alert:Data["alerts"][number]) {
    setBusy(alert.key);setError("");
    try {
      const response=await fetch("/api/alerts",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:alert.kind,id:alert.id,dueDate:alert.dueDate})});
      if(!response.ok) throw new Error((await response.json()).error);
      setRevision(value=>value+1);
    } catch(e){setError(e instanceof Error?e.message:"Não foi possível salvar.");}
    finally{setBusy(null);}
  }
  const unread=data?.alerts.filter(a=>!a.readAt).length??0;
  const visible=data?.alerts.filter(a=>showRead||!a.readAt)??[];
  return <section className="panel" aria-label="Alertas de prazo">
    <div className="actions"><h2>Alertas de prazo{data?` · ${unread} não lido(s)`:""}</h2><button type="button" disabled={loading||!!busy} onClick={()=>setRevision(v=>v+1)}>Atualizar</button>{compact&&<Link href="/alertas">Ver todos →</Link>}</div>
    <p className="muted">Tarefas e objetivos atrasados. Atualizados ao abrir esta área; sem envio de notificações fora do app.</p>
    {!compact&&<label><input type="checkbox" checked={showRead} onChange={e=>setShowRead(e.target.checked)}/> Mostrar também os lidos</label>}
    {error&&<p role="alert">{error}</p>}
    {loading?<p role="status">Consultando prazos…</p>:data&&<>
      {visible.length===0&&<p>{showRead?"Nenhum prazo atrasado nesta consulta.":"Nenhum alerta não lido nesta consulta."}</p>}
      <div className="workspace-stack">{(compact?visible.slice(0,3):visible).map(alert=><article className="panel" key={alert.key}>
        <small>{alert.kind==="task"?"Tarefa atrasada":"Objetivo atrasado"}{alert.readAt?" · Lido":""}</small>
        <h3>{alert.title}</h3><p className="muted">Prazo: {alert.dueDate.split("-").reverse().join("/")}</p>
        <div className="actions"><Link href={alert.kind==="task"?"/tarefas":"/objetivos"}>Abrir {alert.kind==="task"?"tarefas":"objetivos"}</Link>{!alert.readAt&&<button type="button" disabled={!!busy} onClick={()=>mark(alert)}>{busy===alert.key?"Salvando…":"Marcar como lido"}</button>}</div>
      </article>)}</div>
      {data.truncated&&<p className="muted">Exibindo até 100 tarefas e 100 objetivos, dos prazos mais antigos. Outros itens podem estar atrasados.</p>}
      <p className="muted">Marcar como lido não conclui o item. Um novo prazo pode gerar outro alerta. Datas no horário de Brasília.</p>
    </>}
  </section>;
}
