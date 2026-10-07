import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-form";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth/company";

export const instant = false;

export default async function LoginPage() {
  await connection();
  const user = await getCurrentUser();
  if (user) redirect((await getCurrentMembership()) ? "/dashboard" : "/onboarding");
  return <AuthLayout title="Acesse seu sistema" subtitle="Gestão operacional para manutenção de equipamentos."><LoginForm /><p className="mt-6 text-center text-xs text-slate-500">Acesso seguro com Supabase Auth.</p></AuthLayout>;
}

function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <main className="grid min-h-screen place-items-center bg-[#071015] px-5 py-10 text-slate-100"><div className="w-full max-w-md"><Link href="/" aria-label="TecFlow — Gestão Técnica" className="mb-8 flex items-center justify-center gap-3"><span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-lg border border-teal-300/50 bg-teal-300/10 font-mono text-sm font-bold text-teal-300">•</span><span><span className="block font-mono text-sm font-bold tracking-[0.18em] text-white">TecFlow</span><span className="mt-1 block text-[10px] uppercase tracking-[0.18em] text-slate-500">Gestão Técnica</span></span></Link><section className="rounded-2xl border border-white/10 bg-[#0d1a20] p-6 shadow-2xl shadow-black/20 sm:p-8"><h1 className="text-2xl font-semibold text-white">{title}</h1><p className="mt-2 mb-7 text-sm leading-6 text-slate-400">{subtitle}</p>{children}</section></div></main>;
}
