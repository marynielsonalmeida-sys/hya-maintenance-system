export function technicalLibraryMatches(query: string, values: Array<string | null | undefined>, specification?: unknown): boolean {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return [...values, specification ? JSON.stringify(specification) : ""].some((value) => value?.toLowerCase().includes(term));
}
