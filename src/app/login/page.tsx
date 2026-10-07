import Link from "next/link";
import { LoginForm } from "@/components/auth-form";

export default function LoginPage() {
  return <AuthLayout title="Acesse seu sistema" subtitle="Gestão operacional para manutenção de equipamentos."><LoginForm /><p className="mt-6 text-center text-xs text-slate-500">Acesso seguro com Supabase Auth.</p></AuthLayout>;
}

function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <main className="grid min-h-screen place-items-center bg-[#071015] px-5 py-10 text-slate-100"><div className="w-full max-w-md"><Link href="/" className="mb-8 flex items-center justify-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg border border-teal-300/50 bg-teal-300/10 font-mono text-sm font-bold text-teal-300">GM</span><span className="font-mono text-sm font-bold tracking-[0.18em] text-white">GYM MAINTENANCE</span></Link><section className="rounded-2xl border border-white/10 bg-[#0d1a20] p-6 shadow-2xl shadow-black/20 sm:p-8"><h1 className="text-2xl font-semibold text-white">{title}</h1><p className="mt-2 mb-7 text-sm leading-6 text-slate-400">{subtitle}</p>{children}</section></div></main>;
}
