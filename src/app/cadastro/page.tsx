import { RegistrationForm } from "@/components/auth-form";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth/company";

export const instant = false;

export default async function RegistrationPage() {
  await connection();
  const user = await getCurrentUser();
  if (user) redirect((await getCurrentMembership()) ? "/dashboard" : "/onboarding");
  return <main className="grid min-h-screen place-items-center bg-[#071015] px-5 py-10 text-slate-100"><div className="w-full max-w-md"><div className="mb-8 text-center"><p className="font-mono text-sm font-bold tracking-[0.18em] text-teal-300">TecFlow</p><p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">Gestão Técnica</p><h1 className="mt-6 text-3xl font-semibold text-white">Crie seu acesso</h1><p className="mt-2 text-sm text-slate-400">Comece configurando a operação da sua empresa.</p></div><section className="rounded-2xl border border-white/10 bg-[#0d1a20] p-6 shadow-2xl shadow-black/20 sm:p-8"><RegistrationForm /></section></div></main>;
}
