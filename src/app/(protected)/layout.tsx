import { AppShell } from "@/components/app-shell";
import { connection } from "next/server";

export const instant = false;

export default function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ProtectedShell>{children}</ProtectedShell>;
}

async function ProtectedShell({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  return <AppShell>{children}</AppShell>;
}
