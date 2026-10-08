/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { BarChart3, BookOpen, Building2, ClipboardList, Cpu, FileText, Gauge, Menu, Settings, Users, Wrench } from "lucide-react";
import { getCurrentProfile, requireCompany } from "@/lib/auth/company";
import { SignOutButton } from "@/components/sign-out-button";
import { getCompanyLogoUrl } from "@/lib/company/settings";

const links = [
  ["/dashboard", "Dashboard", Gauge], ["/clientes", "Clientes", Building2], ["/equipamentos", "Equipamentos", Cpu],
  ["/chamados", "Chamados", ClipboardList], ["/visitas", "Visitas Técnicas", ClipboardList], ["/orcamentos", "Orçamentos", FileText], ["/biblioteca-tecnica", "Biblioteca Técnica", BookOpen], ["/ordens", "Ordens de Serviço", Wrench], ["/tecnicos", "Técnicos", Users],
  ["/pecas", "Peças", Wrench], ["/financeiro", "Financeiro", BarChart3], ["/relatorios", "Relatórios", BarChart3], ["/configuracoes", "Configurações", Settings],
] as const;

export async function AppShell({ children }: { children: React.ReactNode }) {
  const membership = await requireCompany();
  const profile = await getCurrentProfile();
  const logoUrl = await getCompanyLogoUrl(membership.company.logo_path);
  return <div className="min-h-screen bg-[#071015] text-slate-100 lg:flex">
    <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#09141a] p-5 lg:block">
      <Brand logoUrl={logoUrl} />
      <nav className="mt-10 space-y-1">{links.map(([href, label, Icon]) => <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"><Icon className="h-4 w-4 text-teal-300" />{label}</Link>)}</nav>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="flex h-16 items-center justify-between border-b border-white/10 px-5 sm:px-8">
        <div className="flex items-center gap-3"><MobileNav /><div><p className="text-sm font-semibold text-white">{membership.company.name}</p><p className="text-xs text-slate-500">{profile?.full_name ?? "Usuário"} · {membership.role_code}</p></div></div><SignOutButton />
      </header>
      <main className="p-5 sm:p-8">{children}</main>
    </div>
  </div>;
}

function Brand({ logoUrl }: { logoUrl: string | null }) { return <Link href="/dashboard" aria-label="TecFlow — Gestão Técnica" className="flex items-center gap-3"><div aria-hidden="true" className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg border border-teal-300/50 bg-teal-300/10 font-mono text-sm font-bold text-teal-300">{logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-contain bg-white" /> : "•"}</div><div><p className="font-mono text-sm font-bold tracking-[0.16em] text-white">TecFlow</p><p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Gestão Técnica</p></div></Link>; }

function MobileNav() { return <details className="relative lg:hidden"><summary className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-lg border border-white/10 text-teal-300"><Menu className="h-5 w-5" /></summary><div className="absolute left-0 top-11 z-20 w-60 rounded-xl border border-white/10 bg-[#0d1a20] p-2 shadow-2xl">{links.map(([href, label, Icon]) => <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white"><Icon className="h-4 w-4 text-teal-300" />{label}</Link>)}</div></details>; }
