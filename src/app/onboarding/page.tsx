import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth/company";

export const instant = false;

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (await getCurrentMembership()) redirect("/dashboard");
  return <main className="grid min-h-screen place-items-center bg-[#071015] px-5 py-10 text-slate-100"><div className="w-full max-w-xl"><p className="font-mono text-sm font-bold tracking-[0.18em] text-teal-300">PRIMEIRO ACESSO</p><h1 className="mt-5 text-4xl font-semibold tracking-tight text-white">Crie sua empresa</h1><p className="mt-3 mb-8 max-w-lg text-sm leading-6 text-slate-400">Sua empresa será o espaço seguro para organizar clientes, equipamentos e ordens de serviço.</p><section className="rounded-2xl border border-white/10 bg-[#0d1a20] p-6 shadow-2xl shadow-black/20 sm:p-8"><OnboardingForm /></section></div></main>;
}
