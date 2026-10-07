"use client";

import { useFormStatus } from "react-dom";
import { signOutAction } from "@/app/actions";

export function SignOutButton() {
  return <form action={signOutAction}><SubmitButton /></form>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="text-sm text-slate-400 transition hover:text-white">{pending ? "Saindo..." : "Sair"}</button>;
}
