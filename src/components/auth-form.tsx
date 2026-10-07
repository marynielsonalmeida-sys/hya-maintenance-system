"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, signUpAction, type ActionState } from "@/app/actions";

const initialState: ActionState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);
  return <form action={formAction} className="space-y-4">
    <Field label="E-mail" name="email" type="email" autoComplete="email" />
    <Field label="Senha" name="password" type="password" autoComplete="current-password" />
    <FormMessage state={state} />
    <button disabled={pending} className="button-primary w-full">{pending ? "Entrando..." : "Entrar"}</button>
    <p className="text-center text-sm text-slate-400">Ainda não tem acesso? <Link className="text-teal-300 hover:text-teal-200" href="/cadastro">Criar conta</Link></p>
  </form>;
}

export function RegistrationForm() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);
  return <form action={formAction} className="space-y-4">
    <Field label="Nome completo" name="fullName" autoComplete="name" />
    <Field label="E-mail" name="email" type="email" autoComplete="email" />
    <Field label="Senha" name="password" type="password" autoComplete="new-password" />
    <Field label="Confirmar senha" name="confirmPassword" type="password" autoComplete="new-password" />
    <FormMessage state={state} />
    <button disabled={pending} className="button-primary w-full">{pending ? "Criando conta..." : "Criar conta"}</button>
    <p className="text-center text-sm text-slate-400">Já tem acesso? <Link className="text-teal-300 hover:text-teal-200" href="/login">Entrar</Link></p>
  </form>;
}

function Field({ label, name, type = "text", autoComplete }: { label: string; name: string; type?: string; autoComplete?: string }) {
  return <label className="block text-sm text-slate-300"><span className="mb-2 block">{label}</span><input required name={name} type={type} autoComplete={autoComplete} className="input" /></label>;
}

function FormMessage({ state }: { state: ActionState }) {
  if (state.error) return <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{state.error}</p>;
  if (state.success) return <p role="status" className="rounded-lg border border-teal-300/30 bg-teal-300/10 px-3 py-2 text-sm text-teal-100">{state.success}</p>;
  return null;
}
