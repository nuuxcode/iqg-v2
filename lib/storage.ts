/**
 * @file lib/storage.ts
 * @description Client-only persistence layer for the history feature.
 * Reads, writes, merges, and clears history in localStorage. Plus the
 * exclude-list builder used by the "Give me 3 more" feature.
 * @module Storage
 * @author Mounssif BOUHLAOUI
 * @created 2026-05-25
 *
 * @story
 * No database. History lives in localStorage as a JSON array of `QuestionSet`
 * objects, capped at 50 entries.
 *
 * The non-obvious bit is the merge-top-on-match logic in `saveQuestionSet`.
 * Without it, clicking "Give me 3 more" would create a SECOND history entry
 * for the same session — the user would see two entries for the same role.
 * With it, the top entry is replaced when role+type+difficulty match,
 * giving the user one entry per session that grows as they hit "3 more".
 *
 * Changing role / type / difficulty resets the match, so a new session
 * always creates a fresh history entry. See entry 011 for the bug story.
 */

import type { QuestionSet } from "./types";

/**
 * Cap on stored entries. 50 × ~500 bytes = ~25KB, well under any browser's
 * localStorage limit. Old entries are evicted FIFO.
 */
export const MAX_HISTORY = 50;

/** localStorage key for the full history array. */
const KEY = "iqg_history";

/**
 * Reads the full history from localStorage. Safe on SSR (returns []).
 * Failure-tolerant: if JSON parse throws (corrupted storage), returns []
 * rather than crashing the app.
 *
 * @returns {QuestionSet[]} History array, most-recent first.
 */
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

/**
 * Saves a question set. Merges into the top entry if it's the same session
 * (matching role + type + difficulty); otherwise prepends a new entry.
 *
 * This is how "Give me 3 more" keeps the history clean — one entry per
 * session, even after many clicks. See entry 011 for the full reasoning.
 *
 * @param {QuestionSet} set - The set to save. Will replace the top entry if
 *   its `role.toLowerCase()` + `type` + `difficulty` match.
 */
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

/**
 * Wipes the entire history. Triggered by the "Clear all" button at the
 * bottom of the History drawer.
 */
export function clearHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

/**
 * Returns every question already generated for the given combo, deduped.
 * Sent to the LLM as the "exclude" block so "Give me 3 more" never repeats
 * a question the user has already seen.
 *
 * Deduping is defensive — covers the edge case where old (pre-merge-fix)
 * history might contain the same question twice across two entries.
 *
 * @param {string} role - Job title (case-insensitive match).
 * @param {string} type - Question type (exact match).
 * @param {string} difficulty - Difficulty level (exact match).
 * @returns {string[]} All unique questions for this combo, in storage order.
 */
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
