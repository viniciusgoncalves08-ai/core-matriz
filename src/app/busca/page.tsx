import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { SearchPanel } from "@/features/search/search-panel";
export default async function SearchPage(){
 if(!await getSessionUserId())redirect("/entrar");
 return <AppShell active="Busca" title="Encontre no seu espaço" description="Projetos, tarefas, objetivos, memórias e conversas em uma busca."><SearchPanel/></AppShell>;
}
