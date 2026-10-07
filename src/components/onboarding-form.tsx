"use client";

import { useActionState } from "react";
import { createCompanyAction, type ActionState } from "@/app/actions";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(createCompanyAction, {} satisfies ActionState);
  return <form action={formAction} className="space-y-4">
    <label className="block text-sm text-slate-300"><span className="mb-2 block">Nome da empresa</span><input required name="name" className="input" /></label>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm text-slate-300"><span className="mb-2 block">CNPJ / CPF <small className="text-slate-500">(opcional)</small></span><input name="document" className="input" /></label>
      <label className="block text-sm text-slate-300"><span className="mb-2 block">Telefone</span><input name="phone" type="tel" className="input" /></label>
    </div>
    <label className="block text-sm text-slate-300"><span className="mb-2 block">E-mail da empresa</span><input name="email" type="email" className="input" /></label>
    {state.error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{state.error}</p>}
    <button disabled={pending} className="button-primary w-full">{pending ? "Criando empresa..." : "Criar empresa"}</button>
  </form>;
}
