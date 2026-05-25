/**
 * @file lib/output-filter.ts
 * @description Layer 3 of the prompt-injection defense — scans LLM OUTPUT
 * (not input) for leaked-prompt patterns before the response reaches the user.
 * Designed but not yet wired into the route — listed in README "Tradeoffs"
 * as a v1.1 integration.
 * @module OutputFilter
 * @author Mounssif BOUHLAOUI
 * @created 2026-05-25
 *
 * @story
 * Even with input sanitization and a validator LLM, a determined attacker can
 * sometimes coax the main model into leaking its system prompt or embedding
 * exfil channels (base64 blobs, markdown links, etc.) in the questions.
 *
 * This file catches those after the fact. The intended integration is:
 *
 *   const output = await generateWithFallback({ ... });
 *   if (output.questions.some(containsLeak)) {
 *     return Response.json({ error: "safety filter triggered" }, { status: 502 });
 *   }
 *
 * Skipped from the v1 route because we never observed a real leak during
 * testing and a false positive would frustrate users more than a rare leak.
 * Wiring it in is a one-liner when needed.
 */

/**
 * Regex patterns that indicate the LLM output contains material it shouldn't.
 *
 * Categories:
 *   - "system prompt" / "ignore previous" — direct instruction-leak indicators
 *   - "you are now" / "act as" — role-takeover phrases
 *   - markdown link regex — catches embedded clickable URLs
 *   - base64-blob regex — catches potential data-exfil payloads (>=30 chars
 *     of base64-ish content)
 */
const LEAK_PATTERNS = [
  /system prompt/i,
  /ignore (previous|prior|above|all) (instructions?|prompts?)/i,
  /\byou are now\b/i,
  /\bact as\b/i,
  /\[[^\]]+\]\(https?:\/\/[^)]+\)/, // markdown link
  /[A-Za-z0-9+/]{30,}={0,2}/,        // base64-ish blob >=30 chars
];

/**
 * Single-string leak check. Returns true if any leak pattern matches.
 * Used as the atomic primitive for both tests and the route integration.
 *
 * @param {string} text - One generated question (or any LLM output string).
 * @returns {boolean} true if the text looks like a leak, false if clean.
 */
export function containsLeak(text: string): boolean {
  return LEAK_PATTERNS.some((p) => p.test(text));
}

/**
 * Partitions a list of questions into "clean" and "flagged" buckets.
 *
 * Currently unused in production — the route would either accept the whole
 * response or reject it. `filterQuestions` is there for a future use case
 * where we want to KEEP the clean ones and regenerate only the bad ones.
 *
 * @param {string[]} questions - All questions returned by the main LLM.
 * @returns {{ clean: string[]; flagged: string[] }} Partitioned arrays.
 */
export function filterQuestions(questions: string[]): { clean: string[]; flagged: string[] } {
  const clean: string[] = [];
  const flagged: string[] = [];
  for (const q of questions) {
    if (containsLeak(q)) flagged.push(q);
    else clean.push(q);
  }
  return { clean, flagged };
}
