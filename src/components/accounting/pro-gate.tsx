import { requireFeature } from "@/lib/access/entitlements";
export async function ProGate() { await requireFeature("ACCOUNTING"); return null; }
