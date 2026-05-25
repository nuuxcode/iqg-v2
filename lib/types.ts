/**
 * @file lib/types.ts
 * @description Shared TypeScript types used across server and client.
 * Single source of truth — Zod schemas in `route.ts` validate against
 * the same string literal unions defined here.
 * @module Types
 * @author Mounssif BOUHLAOUI
 * @created 2026-05-25
 *
 * @story
 * Everything here is intentionally a string literal union (not a numeric
 * enum) so the values serialize identically across HTTP and localStorage,
 * are readable in dev tools, and can be validated by Zod's `z.enum`.
 */

/** Three categories the user can pick from in the Type selector. */
export type QuestionType = "behavioral" | "technical" | "situational";

/** Three levels the user can pick from in the Difficulty selector. */
export type Difficulty = "easy" | "medium" | "hard";

/**
 * Shape of the POST body the client sends to `/api/generate`.
 * Mirrors the Zod schema in `app/api/generate/route.ts`.
 */
export interface GenerateRequest {
  role: string;
  type: QuestionType;
  difficulty: Difficulty;
  /** Questions already shown to the user (for the "3 more" exclude block). */
  exclude: string[];
  /** Skip the validator LLM if the client already validated this input. */
  validated?: boolean;
  /** Force the backup model (used by the client to retry a known-failed call). */
  forceBackup?: boolean;
}

/**
 * Output of the validator LLM call. `reason` is only present when invalid.
 */
export interface ValidatorResult {
  valid: boolean;
  reason?: string;
}

/**
 * One entry in the localStorage history. Multiple sessions can share the
 * same `role + type + difficulty` combo — the storage layer merges them.
 */
export interface QuestionSet {
  role: string;
  type: QuestionType;
  difficulty: Difficulty;
  questions: string[];
  /** Unix ms when this set was generated (used for sorting + display). */
  generatedAt: number;
}

/**
 * What lives inside the HMAC-signed rate-limit cookie.
 * Kept tiny on purpose — cookies have a ~4KB limit.
 */
export interface RateLimitState {
  count: number;
  /** Unix ms when this 24h window expires. */
  resetAt: number;
}
