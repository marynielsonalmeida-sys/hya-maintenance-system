import { inviteAccountingContactAction, revokeAccountingContactAction } from "@/lib/accounting/actions";
import { getAccountingContacts } from "@/lib/accounting/queries";
import { AccountingHeader, FormInput, TableOrEmpty } from "@/components/accounting/ui";
import { ProGate } from "@/components/accounting/pro-gate";

export const instant = false;
const modules = ["FISCAL", "HR", "DOCUMENTS", "OBLIGATIONS", "GUIDES", "PAYROLL", "ESOCIAL"];

export default async function AccountantPage() {
  const contacts = await getAccountingContacts();
  return <>
    <ProGate />
    <AccountingHeader title="Contador e permissões" description="Convites ficam pendentes até uma aceitação explícita. Nenhum acesso é concedido automaticamente." />
    <form action={inviteAccountingContactAction} className="mb-7 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:grid-cols-2">
      <FormInput name="name" label="Nome" required />
      <FormInput name="email" label="E-mail" type="email" required />
      <FormInput name="phone" label="Telefone" inputMode="tel" />
      <FormInput name="firmName" label="Escritório (opcional)" />
      <fieldset className="md:col-span-2"><legend className="mb-2 text-sm text-slate-300">Permissões iniciais</legend><div className="grid gap-2 sm:grid-cols-4">{modules.map((module) => <label key={module} className="flex items-center gap-2 text-xs text-slate-300"><input name="permissions" value={module} type="checkbox" />{module}</label>)}</div></fieldset>
      <button className="w-fit rounded-xl bg-teal-300 px-5 py-3 font-semibold text-slate-950 md:col-span-2">Enviar convite pendente</button>
    </form>
    <TableOrEmpty headers={["Contato", "Status", "Permissões", "Ação"]} rows={contacts.map((contact) => {
      const permissions = (Array.isArray(contact.accounting_contact_permissions) ? contact.accounting_contact_permissions : []).filter((permission) => Boolean((permission as Record<string, unknown>).enabled)).map((permission) => String((permission as Record<string, unknown>).module_code)).join(", ");
      return [<span key="name">{String(contact.name)}<br /><span className="text-xs text-slate-500">{String(contact.email)}</span></span>, String(contact.status), permissions || "Nenhuma", contact.status !== "REVOKED" ? <form key="revoke" action={revokeAccountingContactAction}><input type="hidden" name="contactId" value={String(contact.id)} /><button className="text-rose-300 hover:text-rose-200">Revogar</button></form> : "—"];
    })} empty="Nenhum contador convidado." />
  </>;
}
