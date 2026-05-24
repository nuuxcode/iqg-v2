export type QuestionType = "behavioral" | "technical" | "situational";
export type Difficulty = "easy" | "medium" | "hard";

export interface GenerateRequest {
  role: string;
  type: QuestionType;
  difficulty: Difficulty;
  exclude: string[];
  validated?: boolean;
  forceBackup?: boolean;
}

export interface ValidatorResult {
  valid: boolean;
  reason?: string;
}

export interface QuestionSet {
  role: string;
  type: QuestionType;
  difficulty: Difficulty;
  questions: string[];
  generatedAt: number;
}

export interface RateLimitState {
  count: number;
  resetAt: number;
}
