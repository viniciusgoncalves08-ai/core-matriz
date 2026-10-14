import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getSessionUserId } from "@/lib/auth";
import { getFile } from "@/features/files/file-service";
import { FileError, type FilePage } from "@/features/files/file-extraction";
export default async function FilePageView({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getSessionUserId(); if (!userId) redirect("/entrar");
  const file = await getFile(userId, (await params).id).catch(error => { if (error instanceof FileError && error.status === 404) notFound(); throw error; });
  return <AppShell active="Nexus" title={file.name} description="Texto extraído do arquivo. Confira a fonte antes de tomar decisões."><div className="workspace-stack">
    <div className="actions"><Link href={`/historico/${encodeURIComponent(file.conversationId)}`}>Voltar à conversa e gerenciar anexo</Link><a href={`/api/files/${encodeURIComponent(file.id)}?download=1`}>Baixar original</a></div>
    <p className="muted">A extração pode perder tabelas e formatação. Imagens não são interpretadas.</p>
    {(file.pages as FilePage[]).map(page => <section className="panel" id={`pagina-${page.page}`} key={page.page}><h2>Página {page.page}</h2><p className="preserve-text">{page.text || "Sem texto extraído nesta página."}</p></section>)}
  </div></AppShell>;
}
