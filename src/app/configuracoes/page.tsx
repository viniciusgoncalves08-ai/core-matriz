import { AppShell } from "@/components/app-shell";
import { VoiceSettings } from "@/features/nexus/voice-settings";
export default function SettingsPage() {
  return <AppShell active="Configurações" title="Do seu jeito." description="Personalize como você ouve o Nexus."><VoiceSettings /></AppShell>;
}
