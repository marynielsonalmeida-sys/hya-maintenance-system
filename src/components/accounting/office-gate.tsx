import { requireFeature } from "@/lib/access/entitlements";
export async function OfficeGate() { await requireFeature("ACCOUNTING_OFFICE"); return null; }
