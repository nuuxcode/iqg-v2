const LEAK_PATTERNS = [
  /system prompt/i,
  /ignore (previous|prior|above|all) (instructions?|prompts?)/i,
  /\byou are now\b/i,
  /\bact as\b/i,
  /\[[^\]]+\]\(https?:\/\/[^)]+\)/,
  /[A-Za-z0-9+/]{30,}={0,2}/,
];

export function containsLeak(text: string): boolean {
  return LEAK_PATTERNS.some((p) => p.test(text));
}

export function filterQuestions(questions: string[]): { clean: string[]; flagged: string[] } {
  const clean: string[] = [];
  const flagged: string[] = [];
  for (const q of questions) {
    if (containsLeak(q)) flagged.push(q);
    else clean.push(q);
  }
  return { clean, flagged };
}
