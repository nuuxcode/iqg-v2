export const MAX_LEN = 100;

const FORBIDDEN_PATTERNS = [
  /ignore (previous|prior|above|all) (instructions?|prompts?)/i,
  /system prompt/i,
  /you are now/i,
  /act as /i,
  /\bprompt:\s*/i,
];

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
