"use client";

import { useState } from "react";
import { updateCompanySettingsAction } from "@/app/actions";
import { formatCompanyPhone, formatCompanyTaxId } from "@/lib/auth/validation";

type CompanyValue = Record<string, string | null | undefined>;

export function CompanySettingsForm({ company }: { company: CompanyValue }) {
  const [document, setDocument] = useState(formatCompanyTaxId(String(company.document ?? "")));
  const [phone, setPhone] = useState(formatCompanyPhone(String(company.phone ?? "")));
  const [whatsapp, setWhatsapp] = useState(formatCompanyPhone(String(company.whatsapp ?? "")));
  return <form action={updateCompanySettingsAction} className="grid gap-4 sm:grid-cols-2"><Field label="Nome fantasia *" name="commercialName" defaultValue={String(company.commercial_name ?? company.name ?? "")} required /><Field label="Razão social" name="legalName" defaultValue={company.legal_name ?? ""} /><label className="field-label">CPF ou CNPJ *<input required name="document" value={document} onChange={(event) => setDocument(formatCompanyTaxId(event.target.value))} inputMode="numeric" className="field-input" /></label><label className="field-label">Telefone *<input required name="phone" value={phone} onChange={(event) => setPhone(formatCompanyPhone(event.target.value))} inputMode="tel" type="tel" className="field-input" /></label><label className="field-label">WhatsApp *<input required name="whatsapp" value={whatsapp} onChange={(event) => setWhatsapp(formatCompanyPhone(event.target.value))} inputMode="tel" type="tel" className="field-input" /></label><Field label="E-mail *" name="email" type="email" defaultValue={company.email ?? ""} required /><Field label="CEP" name="postalCode" inputMode="numeric" defaultValue={company.postal_code ?? ""} /><Field label="Endereço" name="street" defaultValue={company.street ?? company.address ?? ""} /><Field label="Número" name="addressNumber" defaultValue={company.address_number ?? ""} /><Field label="Complemento" name="complement" defaultValue={company.complement ?? ""} /><Field label="Bairro" name="neighborhood" defaultValue={company.neighborhood ?? ""} /><Field label="Cidade" name="city" defaultValue={company.city ?? ""} /><Field label="Estado" name="state" maxLength={2} defaultValue={company.state ?? ""} /><Field label="Site" name="website" type="url" defaultValue={company.website ?? ""} /><button className="button-primary sm:col-span-2">Salvar dados da empresa</button></form>;
}

function Field({ label, name, type = "text", defaultValue, required, inputMode, maxLength }: { label: string; name: string; type?: string; defaultValue?: string | null; required?: boolean; inputMode?: "numeric" | "tel"; maxLength?: number }) { return <label className="field-label">{label}<input name={name} type={type} required={required} inputMode={inputMode} maxLength={maxLength} defaultValue={defaultValue ?? ""} className="field-input" /></label>; }
