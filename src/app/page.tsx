import {
  ArrowUpRight,
  BarChart3,
  Building2,
  ClipboardCheck,
  Cpu,
  Gauge,
  Hammer,
  ShieldCheck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { futureModules, type FutureModuleKey } from "@/lib/modules";

const moduleIcons: Record<FutureModuleKey, LucideIcon> = {
  dashboard: Gauge,
  clients: Building2,
  equipment: Cpu,
  tickets: ClipboardCheck,
  workOrders: Wrench,
  preventive: ShieldCheck,
  corrective: Hammer,
  visits: ClipboardCheck,
  technicians: Users,
  parts: Wrench,
  quotes: BarChart3,
  photos: ClipboardCheck,
  signatures: ShieldCheck,
  finance: BarChart3,
  reports: BarChart3,
  users: Users,
};

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#071015] text-[#e8f0f0]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-5 py-5 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div aria-label="Placeholder da logo TecFlow" className="grid h-10 w-10 place-items-center rounded-lg border border-[#72e0c0]/50 bg-[#72e0c0]/10 font-mono text-sm font-bold text-[#72e0c0]">•</div>
            <div><p className="font-mono text-sm font-bold tracking-[0.2em] text-white">TecFlow</p><p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-[#8ca0a4]">Gestão Técnica</p></div>
          </div>
          <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8ca0a4] sm:flex"><span className="h-2 w-2 rounded-full bg-[#72e0c0] shadow-[0_0_12px_#72e0c0]" />Local foundation / v0.1</div>
        </header>

        <section className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20 lg:py-20">
          <div className="max-w-2xl">
            <p className="mb-5 font-mono text-xs font-semibold tracking-[0.12em] text-[#72e0c0]">Seu serviço, seu fluxo, seu controle</p>
            <h1 className="max-w-xl text-5xl font-semibold leading-[0.98] tracking-[-0.05em] text-white sm:text-6xl lg:text-8xl">Gestão de<br /><span className="text-[#72e0c0]">Manutenção</span></h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-[#9db0b3] sm:text-lg">Equipamentos <span className="mx-2 text-[#72e0c0]">•</span> Chamados <span className="mx-2 text-[#72e0c0]">•</span> Ordens de Serviço</p>
            <Link href="/login" className="mt-9 inline-flex items-center gap-3 rounded-md bg-[#72e0c0] px-5 py-3 text-sm font-bold text-[#071015] transition hover:bg-[#a0f0d8]">Entrar no Sistema <ArrowUpRight className="h-4 w-4" /></Link>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-12 bg-[#72e0c0]/10 blur-3xl" />
            <div className="relative rounded-2xl border border-white/10 bg-[#0d1a20]/90 p-5 shadow-2xl shadow-black/30 sm:p-7">
              <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8ca0a4]">System overview</p><p className="mt-1 text-sm font-semibold text-white">Operação em foco</p></div><Gauge className="h-5 w-5 text-[#72e0c0]" /></div>
              <div className="grid grid-cols-2 gap-3"><Metric label="Equipamentos" value="—" /><Metric label="Chamados abertos" value="—" /><Metric label="Em manutenção" value="—" /><Metric label="SLA médio" value="—" /></div>
              <div className="mt-5 rounded-lg border border-dashed border-[#72e0c0]/30 bg-[#72e0c0]/5 p-4"><div className="flex items-center gap-3"><Wrench className="h-5 w-5 text-[#72e0c0]" /><div><p className="text-sm font-semibold text-white">Base pronta para conectar</p><p className="mt-1 text-xs leading-5 text-[#8ca0a4]">Dados e integrações entram na próxima fase.</p></div></div></div>
            </div>
          </div>
        </section>

        <section id="modules" className="border-t border-white/10 py-8">
          <div className="mb-5 flex items-end justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#72e0c0]">Architecture map</p><h2 className="mt-2 text-xl font-semibold text-white">Módulos preparados</h2></div><p className="hidden max-w-xs text-right text-xs leading-5 text-[#8ca0a4] sm:block">Estrutura inicial sem dados reais ou integrações externas.</p></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{futureModules.map((module) => { const Icon = moduleIcons[module.key]; return <div key={module.key} className="group rounded-lg border border-white/10 bg-white/[0.03] p-3 transition hover:border-[#72e0c0]/40 hover:bg-[#72e0c0]/5"><Icon className="h-4 w-4 text-[#72e0c0]" /><p className="mt-3 text-sm font-semibold text-white">{module.name}</p><p className="mt-1 text-[11px] leading-4 text-[#8ca0a4]">{module.description}</p></div>; })}</div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4"><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8ca0a4]">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p></div>;
}
