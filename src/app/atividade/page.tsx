import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUserId } from "@/lib/auth";
import { activityFilter, activityLabels, listActivity } from "@/features/activity/activity-service";

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/entrar");
  const parsed = activityFilter.safeParse(await searchParams);
  const filter = parsed.success ? parsed.data : activityFilter.parse({});
  let data: Awaited<ReturnType<typeof listActivity>> | null = null;
  try { data = await listActivity(userId, filter); } catch { /* Recoverable database failure. */ }
  const pageLink = (page: number) => `/atividade?${new URLSearchParams({ kind: filter.kind, result: filter.result, page: String(page) })}`;
  return <AppShell active="Histórico" title="Atividade do Core" description="Acompanhe as alterações e respostas registradas na sua conta.">
    <div className="workspace-stack">
      <div className="actions"><Link className="button-link" href="/historico">Conversas</Link><span className="tag">Atividade</span></div>
      <form className="panel workspace-form" action="/atividade">
        <div className="work-fields">
          <label>Área<select name="kind" defaultValue={filter.kind}><option value="all">Todas</option><option value="memory">Memória</option><option value="project">Projetos</option><option value="task">Tarefas</option><option value="agent">Agentes</option><option value="conversation">Nexus</option></select></label>
          <label>Resultado<select name="result" defaultValue={filter.result}><option value="all">Todos</option><option value="success">Concluído</option><option value="failure">Não concluído</option></select></label>
        </div><div className="actions"><button type="submit">Filtrar</button><Link href="/atividade">Limpar filtros</Link></div>
      </form>
      <p className="muted">Horários de Brasília. Alterações de memória anteriores a esta atualização podem não ter registro.</p>
      {!data && <div className="panel" role="alert">Não foi possível carregar a atividade. <Link href={pageLink(filter.page)}>Tentar novamente</Link></div>}
      {data && !data.items.length && <p className="panel muted">Nenhuma atividade encontrada nesta página com esses filtros.</p>}
      {data?.items.map(item => <article className="panel workspace-stack" key={item.id}>
        <div className="actions"><strong>{activityLabels[item.action] ?? "Atividade registrada"}</strong><span className="tag">{item.success ? "Concluído" : "Não concluído"}</span></div>
        <time className="muted" dateTime={item.createdAt.toISOString()}>{item.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</time>
        <div className="actions">{item.model && <span className="tag">Modelo: {item.model}</span>}{item.durationMs !== null && <span className="muted">{(item.durationMs / 1000).toFixed(1)} s</span>}</div>
        {item.entityId && item.entityType === "conversation" && <Link href={`/historico/${encodeURIComponent(item.entityId)}`}>Abrir conversa</Link>}
        {item.entityId && item.entityType === "project" && <Link href={`/projetos/${encodeURIComponent(item.entityId)}`}>Abrir projeto</Link>}
      </article>)}
      {data && <nav className="actions" aria-label="Páginas de atividade">{filter.page > 1 && <Link className="button-link" href={pageLink(filter.page - 1)}>Anterior</Link>}<span>Página {filter.page}</span>{data.hasMore && filter.page < 1000 && <Link className="button-link" href={pageLink(filter.page + 1)}>Próxima</Link>}</nav>}
    </div>
  </AppShell>;
}
