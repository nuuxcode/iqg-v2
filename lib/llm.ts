import { generateText, generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { buildValidatorPrompt } from "./prompts";
import type { ValidatorResult } from "./types";

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });

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
    console.error("[validator]", (e as Error).message);
    return { valid: false, reason: `validator error: ${(e as Error).message}` };
  }
}

export async function generateWithFallback(args: {
  prompt: string;
  forceBackup?: boolean;
}): Promise<{ questions: string[] }> {
  const mainModel = args.forceBackup
    ? process.env.GEMINI_MODEL_BACKUP!
    : process.env.GEMINI_MODEL_MAIN!;
  const backupModel = process.env.GEMINI_MODEL_BACKUP!;

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
    if (mainModel === backupModel) throw e;
    return await tryModel(backupModel);
  }
}
