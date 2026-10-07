import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TecFlow | Gestão Técnica",
  description: "TecFlow — gestão técnica para serviços, equipamentos e operações em campo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
