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
  const next = [set, ...current].slice(0, MAX_HISTORY);
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
  return loadHistory()
    .filter(
      (s) =>
        s.role.toLowerCase() === role.toLowerCase() &&
        s.type === type &&
        s.difficulty === difficulty,
    )
    .flatMap((s) => s.questions);
}
