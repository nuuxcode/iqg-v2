/**
 * @file lib/stream-parser.ts
 * @description Safely extracts a `questions[]` array from any partial or
 * complete LLM response object. Defensive parsing — never trusts the shape.
 * @module StreamParser
 * @author Mounssif BOUHLAOUI
 * @created 2026-05-25
 *
 * @story
 * Originally designed for streaming output (partial JSON arriving piece by
 * piece). Now used on the full response because `streamObject` from AI SDK
 * v6 returns 0 bytes in production (see entry 013 part 2). The defensive
 * parsing still matters — Gemini occasionally returns null or empty values
 * mid-array, and this layer silently filters them out so the UI never
 * renders broken cards.
 */

/**
 * Pull a clean `string[]` of questions from whatever the LLM returned.
 *
 * Step-by-step narrowing:
 *   1. Not an object  -> []
 *   2. No `questions` property or not an array  -> []
 *   3. Filter out any non-string or empty-string entries
 *
 * @param {unknown} partial - The raw object from the LLM (or undefined).
 * @returns {string[]} A clean array of non-empty question strings.
 */
export function extractQuestions(partial: unknown): string[] {
  if (!partial || typeof partial !== "object") return [];
  const qs = (partial as { questions?: unknown }).questions;
  if (!Array.isArray(qs)) return [];
  return qs.filter((q): q is string => typeof q === "string" && q.length > 0);
}
