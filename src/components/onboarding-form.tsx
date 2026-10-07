"use client";

import { useActionState, useState } from "react";
import { createCompanyAction, type ActionState } from "@/app/actions";
import { formatCompanyPhone, formatCompanyTaxId } from "@/lib/auth/validation";

export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(createCompanyAction, {} satisfies ActionState);
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  return <form action={formAction} className="space-y-4">
    <label className="block text-sm text-slate-300"><span className="mb-2 block">Nome da empresa <span className="text-slate-500">*</span></span><input required name="name" className="input" /></label>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm text-slate-300"><span className="mb-2 block">CPF ou CNPJ <span className="text-slate-500">*</span></span><input required name="document" value={document} onChange={(event) => setDocument(formatCompanyTaxId(event.target.value))} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" className="input" /></label>
      <label className="block text-sm text-slate-300"><span className="mb-2 block">Telefone <span className="text-slate-500">*</span></span><input required name="phone" value={phone} onChange={(event) => setPhone(formatCompanyPhone(event.target.value))} type="tel" inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" className="input" /></label>
    </div>
    <label className="block text-sm text-slate-300"><span className="mb-2 block">E-mail <span className="text-slate-500">*</span></span><input required name="email" type="email" inputMode="email" autoComplete="email" placeholder="empresa@exemplo.com" className="input" /></label>
    {state.error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{state.error}</p>}
    <button disabled={pending} className="button-primary w-full">{pending ? "Criando empresa..." : "Criar empresa"}</button>
  </form>;
}
