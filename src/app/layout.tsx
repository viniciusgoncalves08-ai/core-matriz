import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Core Matriz — Nexus",
  description: "Sistema operacional pessoal inteligente com Nexus como interface central.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
