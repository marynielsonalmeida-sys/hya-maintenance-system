export function toggleSelection(selectedIds: string[], id: string): string[] {
  return selectedIds.includes(id) ? selectedIds.filter((selectedId) => selectedId !== id) : [...selectedIds, id];
}

export function appendDiagnosis(current: string, shortcut: string): string {
  return current.trim() ? `${current.trim()}; ${shortcut}` : shortcut;
}

export function calculateVisitTotal(lines: Array<{ quantity: number; unitPrice: number | null }>): number {
  return lines.reduce((total, line) => total + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0), 0);
}

export function validateVisitDraft(clientId: string, equipmentIds: string[]): string | null {
  if (!clientId) return "CLIENT_REQUIRED";
  if (equipmentIds.length === 0) return "EQUIPMENT_REQUIRED";
  return null;
}

export function isCompanyRecordAllowed(recordCompanyId: string, currentCompanyId: string): boolean {
  return recordCompanyId === currentCompanyId;
}
