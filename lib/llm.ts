/**
 * @file lib/llm.ts
 * @description Wraps every Gemini call the app makes. Exports two functions:
 * `validate` (cheap classification) and `generateWithFallback` (main generator
 * with automatic backup model). Used only by `app/api/generate/route.ts`.
 * @module Llm
 * @author Mounssif BOUHLAOUI
 * @created 2026-05-25
 *
 * @story
 * The app uses a two-stage LLM pipeline:
 *
 *   - VALIDATOR  (Gemini 2.5 Flash-Lite, temperature=0)
 *     Decides: is the user's input a real job title or garbage?
 *     Returns { valid: true } or { valid: false, reason }.
 *     Costs roughly $0.0001 per call.
 *
 *   - MAIN       (Gemini 2.5 Flash, temperature=0.7)
 *     Writes 3 interview questions matching the role, type, difficulty.
 *     Output is constrained by a Zod schema so the API always gets exactly
 *     three strings back.
 *
 *   - BACKUP     (Gemini 2.5 Flash-Lite, same as validator)
 *     Auto-retries the generation if the main model errors or times out.
 *     Same Gemini family so no extra SDK or auth.
 *
 * Model names come from env vars so we can swap models in the Vercel
 * dashboard without a code change. The Google client is created once at
 * module load using the user-named `GEMINI_API_KEY` env var (we pass it
 * explicitly because the AI SDK looks for `GOOGLE_GENERATIVE_AI_API_KEY`
 * by default).
 */

import { generateText, generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { buildValidatorPrompt } from "./prompts";
import type { ValidatorResult } from "./types";

/**
 * Single Gemini client instance reused for every call.
 * We construct it explicitly so we can use our own env var name
 * (`GEMINI_API_KEY` instead of the SDK's default `GOOGLE_GENERATIVE_AI_API_KEY`).
 */
const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Schema enforced on the main LLM's structured output.
 * If Gemini returns anything that isn't exactly 3 strings, `generateObject`
 * throws — which triggers the backup model.
 */
export const QuestionsSchema = z.object({
  questions: z.array(z.string()).length(3),
});

/**
 * Runs the cheap validator LLM to decide whether the input is a real job role.
 *
 * Catches every error (network, parsing, model errors) and returns a
 * structured `{ valid: false, reason }` so callers never see exceptions.
 * The error message is surfaced in the `reason` so production bugs are
 * self-diagnosing (a deliberate tradeoff for a portfolio demo — in a real
 * product I'd log server-side and return a generic message).
 *
 * @param {string} input - The user's sanitized job-title input.
 * @returns {Promise<ValidatorResult>} `{ valid: true }` if the input is a real
 *   role, otherwise `{ valid: false, reason: "<short string>" }`.
 */
export async function validate(input: string): Promise<ValidatorResult> {
  try {
    const res = await generateText({
      model: google(process.env.GEMINI_MODEL_VALIDATOR!),
      prompt: buildValidatorPrompt(input),
      temperature: 0,
    });
    // Some Gemini responses wrap JSON in ```json ... ``` markdown fences;
    // strip them before parsing.
    const text = res.text.trim().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(text) as ValidatorResult;
    if (typeof parsed.valid !== "boolean") {
      return { valid: false, reason: "malformed validator response" };
    }
    return parsed;
  } catch (e) {
    console.error("[validator]", (e as Error).message);
    return { valid: false, reason: `validator error: ${(e as Error).message}` };
  }
}

/**
 * Runs the main generator LLM. If it throws, automatically retries with the
 * backup model. If the backup also throws, the error propagates to the caller.
 *
 * @param {object} args
 * @param {string} args.prompt - The fully-built main prompt (see `buildMainPrompt`).
 * @param {boolean} [args.forceBackup] - Skip the main model and go straight to
 *   the backup. Used by the client to retry a known-failed call.
 * @returns {Promise<{ questions: string[] }>} An object with exactly 3 questions
 *   (Zod-schema-enforced).
 * @throws {Error} When both main and backup models fail. Caller is responsible
 *   for returning a user-friendly error.
 */
export async function generateWithFallback(args: {
  prompt: string;
  forceBackup?: boolean;
}): Promise<{ questions: string[] }> {
  const mainModel = args.forceBackup
    ? process.env.GEMINI_MODEL_BACKUP!
    : process.env.GEMINI_MODEL_MAIN!;
  const backupModel = process.env.GEMINI_MODEL_BACKUP!;

  /**
   * Single attempt against one model. Validated by `QuestionsSchema`.
   */
  const tryModel = async (modelId: string) => {
    const res = await generateObject({
      model: google(modelId),
      schema: QuestionsSchema,
      prompt: args.prompt,
      temperature: 0.7,
    });
    return res.object;
  };

  try {
    return await tryModel(mainModel);
  } catch (e) {
    console.error("[main-llm]", (e as Error).message);
    // If env vars are mis-set and main === backup, don't retry the same call.
    if (mainModel === backupModel) throw e;
    return await tryModel(backupModel);
  }
}
