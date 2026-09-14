import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { MemoryManager } from "@/features/memory/memory-manager";

export default async function MemoryPage() {
  if (!await getSessionUserId()) redirect("/entrar");
  return <AppShell active="Memória" title="O que o Nexus sabe sobre mim" description="Revise as informações que podem orientar suas conversas."><MemoryManager /></AppShell>;
}
