import type { QuestionSet } from "./types";

export const MAX_HISTORY = 50;
const KEY = "iqg_history";

export function loadHistory(): QuestionSet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QuestionSet[];
  } catch {
    return [];
  }
}

export function saveQuestionSet(set: QuestionSet): void {
  if (typeof window === "undefined") return;
  const current = loadHistory();
  const top = current[0];
  const sameSession =
    top &&
    top.role.toLowerCase() === set.role.toLowerCase() &&
    top.type === set.type &&
    top.difficulty === set.difficulty;
  const next = sameSession
    ? [set, ...current.slice(1)].slice(0, MAX_HISTORY)
    : [set, ...current].slice(0, MAX_HISTORY);
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function getQuestionsForCombo(
  role: string,
  type: string,
  difficulty: string,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of loadHistory()) {
    if (
      s.role.toLowerCase() === role.toLowerCase() &&
      s.type === type &&
      s.difficulty === difficulty
    ) {
      for (const q of s.questions) {
        if (!seen.has(q)) {
          seen.add(q);
          out.push(q);
        }
      }
    }
  }
  return out;
}
