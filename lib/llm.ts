import { generateText, streamObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { buildValidatorPrompt } from "./prompts";
import type { ValidatorResult } from "./types";

export const QuestionsSchema = z.object({
  questions: z.array(z.string()).length(3),
});

export async function validate(input: string): Promise<ValidatorResult> {
  try {
    const res = await generateText({
      model: google(process.env.GEMINI_MODEL_VALIDATOR!),
      prompt: buildValidatorPrompt(input),
      temperature: 0,
    });
    const text = res.text.trim().replace(/^```json\s*|\s*```$/g, "");
    const parsed = JSON.parse(text) as ValidatorResult;
    if (typeof parsed.valid !== "boolean") {
      return { valid: false, reason: "malformed validator response" };
    }
    return parsed;
  } catch (e) {
    console.error("[validator]", (e as Error).message, (e as Error).stack?.slice(0, 500));
    return { valid: false, reason: `validator error: ${(e as Error).message}` };
  }
}

export function generateWithFallback(args: { prompt: string; forceBackup?: boolean }) {
  const mainModel = args.forceBackup
    ? process.env.GEMINI_MODEL_BACKUP!
    : process.env.GEMINI_MODEL_MAIN!;
  const backupModel = process.env.GEMINI_MODEL_BACKUP!;

  const tryModel = (modelId: string) =>
    streamObject({
      model: google(modelId),
      schema: QuestionsSchema,
      prompt: args.prompt,
      temperature: 0.7,
    });

  try {
    return tryModel(mainModel);
  } catch (e) {
    if (mainModel === backupModel) throw e;
    return tryModel(backupModel);
  }
}
