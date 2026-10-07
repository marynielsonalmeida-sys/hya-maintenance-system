import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GYM MAINTENANCE | Gestão de Manutenção",
  description: "Fundação para gestão de manutenção de equipamentos de academia.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
