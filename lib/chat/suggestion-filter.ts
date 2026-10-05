/**
 * Filtro local de los ejemplos de consulta. No consulta el corpus ni
 * cambia qué instrumentos puede recuperar el chat.
 */
export function foldSearchText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function filterSuggestions(suggestions: readonly string[], query: string): string[] {
  const needle = foldSearchText(query);
  if (!needle) return [...suggestions];
  return suggestions.filter((suggestion) => foldSearchText(suggestion).includes(needle));
}
