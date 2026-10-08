/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { BarChart3, BookOpen, Building2, ClipboardList, Cpu, FileText, Gauge, Menu, ReceiptText, Settings, Users, Wrench } from "lucide-react";
import { getCurrentProfile, requireCompany } from "@/lib/auth/company";
import { SignOutButton } from "@/components/sign-out-button";
import { getCompanyLogoUrl } from "@/lib/company/settings";

const links = [
  ["/dashboard", "Dashboard", Gauge], ["/clientes", "Clientes", Building2], ["/equipamentos", "Equipamentos", Cpu],
  ["/chamados", "Chamados", ClipboardList], ["/visitas", "Visitas Técnicas", ClipboardList], ["/orcamentos", "Orçamentos", FileText], ["/biblioteca-tecnica", "Biblioteca Técnica", BookOpen], ["/ordens", "Ordens de Serviço", Wrench], ["/tecnicos", "Técnicos", Users],
  ["/pecas", "Peças", Wrench], ["/meu-contador", "Meu Contador", ReceiptText], ["/financeiro", "Financeiro", BarChart3], ["/relatorios", "Relatórios", BarChart3], ["/configuracoes", "Configurações", Settings],
] as const;

export async function AppShell({ children }: { children: React.ReactNode }) {
  const membership = await requireCompany();
  const profile = await getCurrentProfile();
  const logoUrl = await getCompanyLogoUrl(membership.company.logo_path);
  return <div className="min-h-screen bg-[#071015] text-slate-100 lg:flex">
    <aside className="hidden h-dvh w-64 shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#09141a] p-5 lg:flex">
      <div className="shrink-0"><Brand logoUrl={logoUrl} /><div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-3"><p className="truncate text-sm font-semibold text-white">{membership.company.name}</p><div className="mt-2 flex items-center justify-between gap-2"><p className="truncate text-xs text-slate-500">{profile?.full_name ?? "Usuário"}</p>{membership.company.plan_code && <span className="shrink-0 rounded-full border border-teal-300/30 bg-teal-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-200">{membership.company.plan_code}</span>}</div></div></div>
      <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-6 pr-1"><div className="space-y-1">{links.filter(([href]) => href !== "/configuracoes").map(([href, label, Icon]) => <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"><Icon className="h-4 w-4 text-teal-300" />{label}</Link>)}</div></nav>
      <footer className="shrink-0 border-t border-white/10 pt-4"><Link href="/configuracoes" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"><Settings className="h-4 w-4 text-teal-300" />Configurações</Link><div className="px-3 py-2"><SignOutButton /></div></footer>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="flex h-16 items-center justify-between border-b border-white/10 px-5 sm:px-8">
        <div className="flex items-center gap-3"><MobileNav /><div><p className="text-sm font-semibold text-white">{membership.company.name}</p><p className="text-xs text-slate-500">{profile?.full_name ?? "Usuário"} · {membership.role_code}</p></div></div><div className="lg:hidden"><SignOutButton /></div>
      </header>
      <main className="p-5 sm:p-8">{children}</main>
    </div>
  </div>;
}

function Brand({ logoUrl }: { logoUrl: string | null }) { return <Link href="/dashboard" aria-label="TecFlow — Gestão Técnica" className="flex items-center gap-3"><div aria-hidden="true" className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg border border-teal-300/50 bg-teal-300/10 font-mono text-sm font-bold text-teal-300">{logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-contain bg-white" /> : "•"}</div><div><p className="font-mono text-sm font-bold tracking-[0.16em] text-white">TecFlow</p><p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Gestão Técnica</p></div></Link>; }

function MobileNav() { return <details className="relative lg:hidden"><summary className="grid h-9 w-9 cursor-pointer list-none place-items-center rounded-lg border border-white/10 text-teal-300"><Menu className="h-5 w-5" /></summary><div className="absolute left-0 top-11 z-20 w-60 rounded-xl border border-white/10 bg-[#0d1a20] p-2 shadow-2xl">{links.map(([href, label, Icon]) => <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white"><Icon className="h-4 w-4 text-teal-300" />{label}</Link>)}</div></details>; }
