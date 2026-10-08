import { MemorySettings } from "@/features/settings/memory-settings";
import { AppShell } from "@/components/app-shell";
import { VoiceSettings } from "@/features/nexus/voice-settings";
export default function SettingsPage() {
  return <AppShell active="Configurações" title="Do seu jeito." description="Personalize a memória e a voz do Nexus."><div className="workspace-stack"><MemorySettings /><VoiceSettings /></div></AppShell>;
}
