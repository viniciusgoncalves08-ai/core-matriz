import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUserId } from "@/lib/auth";
import { getMemoryDetail } from "@/features/memory/memory-detail-service";
import { MemoryDetailControls } from "@/features/memory/memory-detail-controls";
const labels: Record<string,string> = { FACT:"Fato", PREFERENCE:"Preferência", DECISION:"Decisão", HYPOTHESIS:"Hipótese", OBSERVED_PATTERN:"Padrão observado", CONTEXT:"Contexto", KNOWLEDGE:"Conhecimento", RESTRICTION:"Restrição", GOAL:"Objetivo" };
const date = (value: Date) => value.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
export default async function MemoryDetailPage({ params }: { params: Promise<{id:string}> }) {
  const userId = await getSessionUserId(); if (!userId) redirect("/entrar");
  const memory = await getMemoryDetail(userId, (await params).id); if (!memory) notFound();
  const active = "content" in memory && memory.status === "ACTIVE" && memory.validFrom <= new Date() && (!memory.validUntil || memory.validUntil > new Date());
  return <AppShell active="Memória" title="Revisar memória" description="Confira o registro que pode orientar o Nexus."><div className="workspace-stack memory-workspace">
    <Link href="/memoria">← Todas as memórias</Link>
    {!("content" in memory) ? <div className="panel"><h2>Esta memória foi excluída</h2><p>O registro deixou de ser usado como memória. A conversa de origem e os registros de auditoria não são apagados por essa ação.</p></div> : <>
      <article className="panel memory-result"><div className="actions"><span className="tag">{labels[memory.classification]}</span><span>{active ? "Disponível para contexto" : memory.status === "BLOCKED" ? "Bloqueada · fora do contexto" : memory.status === "SUPERSEDED" ? "Substituída · fora do contexto" : "Fora da validade atual"}</span></div>
        <p className="preserve-text">{memory.content}</p>
        {memory.summary && <p>Resumo: {memory.summary}</p>}
        <p className="muted">Origem: {memory.source || "Não informada"}</p>
        <p className="muted">Criada: {date(memory.createdAt)} · Atualizada: {date(memory.updatedAt)} · Brasília</p>
        {memory.conversationId && <Link href={`/historico/${encodeURIComponent(memory.conversationId)}`}>Abrir conversa de origem →</Link>}
        <MemoryDetailControls id={memory.id} content={memory.content} status={memory.status} />
      </article>
      <section className="panel"><h2>Últimos registros de versão</h2><p className="muted">Até 10 registros, do mais recente ao mais antigo.</p>{memory.versions.length ? memory.versions.map(version => <div className="version" key={version.id}><small>{date(version.createdAt)} · {version.reason || "Sem motivo informado"}</small><p className="preserve-text">{version.content}</p></div>) : <p>Nenhum registro de versão disponível.</p>}</section>
    </>}
  </div></AppShell>;
}
