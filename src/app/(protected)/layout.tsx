import { AppShell } from "@/components/app-shell";

export const instant = false;

export default function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AppShell>{children}</AppShell>;
}
