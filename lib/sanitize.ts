/**
 * @file lib/sanitize.ts
 * @description First line of defense against prompt injection and bad input.
 * Strips dangerous characters, enforces a length cap, rejects obvious
 * instruction-attempts. Runs server-side BEFORE any LLM call so we don't
 * waste API quota on garbage input.
 * @module Sanitize
 * @author Mounssif BOUHLAOUI
 * @created 2026-05-25
 *
 * @story
 * Layer 1 of a 3-layer prompt-injection defense:
 *   1. THIS FILE       — string-level sanitization (cheap, server-side, no LLM)
 *   2. validator LLM   — semantic check ("is this an instruction attempt?")
 *   3. output filter   — scans LLM output for leaked-prompt patterns
 *
 * Choices:
 *   - Strip newlines: multi-line payloads are a common injection pattern
 *     ("Senior Engineer\n\nIgnore previous instructions...").
 *   - Strip <, >, backticks: used to smuggle fake tags or code fences.
 *   - 100-char cap: blocks long payloads. Longest reasonable job title
 *     ("Senior Staff Machine Learning Engineer at Anthropic") = 51 chars.
 *   - Denylist > allowlist: an allowlist of `[A-Za-z ]` would block legit
 *     roles like "C++ Engineer", "DevOps/SRE", "Engineer (L5)".
 *   - Throw on violation (don't return false): forces the caller to handle
 *     the error explicitly and returns a 400 to the client.
 */

/**
 * Maximum allowed length of the sanitized input.
 * 100 chars comfortably fits any real job title; longer = either a typo
 * or an injection attempt.
 */
export const MAX_LEN = 100;

/**
 * Regex patterns that indicate the input is an instruction attempt, not a
 * job title. Add new patterns here as new attack styles emerge.
 */
const FORBIDDEN_PATTERNS = [
  /ignore (previous|prior|above|all) (instructions?|prompts?)/i,
  /system prompt/i,
  /you are now/i,
  /act as /i,
  /\bprompt:\s*/i,
];

/**
 * Normalize the user's input and reject it if it looks dangerous.
 *
 * Pipeline:
 *   1. Replace newlines with spaces (kills multi-line payloads).
 *   2. Strip `<`, `>`, backtick (kills tag and code-fence smuggling).
 *   3. Collapse whitespace and trim.
 *   4. Reject if empty.
 *   5. Reject if longer than `MAX_LEN`.
 *   6. Reject if matches any pattern in `FORBIDDEN_PATTERNS`.
 *
 * @param {string} raw - Unsanitized input from the request body.
 * @returns {string} The cleaned, safe-to-send-to-LLM string.
 * @throws {Error} "Input is empty", "Input exceeds N chars", or
 *   "Input contains a forbidden pattern" — caller returns these as HTTP 400.
 */
export function sanitizeInput(raw: string): string {
  const stripped = raw
    .replace(/[\r\n]+/g, " ")
    .replace(/[<>`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (stripped.length === 0) {
    throw new Error("Input is empty");
  }
  if (stripped.length > MAX_LEN) {
    throw new Error(`Input exceeds ${MAX_LEN} chars`);
  }
  for (const p of FORBIDDEN_PATTERNS) {
    if (p.test(stripped)) {
      throw new Error("Input contains a forbidden pattern");
    }
  }
  return stripped;
}
