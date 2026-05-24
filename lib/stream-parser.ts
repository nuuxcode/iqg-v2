export function extractQuestions(partial: unknown): string[] {
  if (!partial || typeof partial !== "object") return [];
  const qs = (partial as { questions?: unknown }).questions;
  if (!Array.isArray(qs)) return [];
  return qs.filter((q): q is string => typeof q === "string" && q.length > 0);
}
