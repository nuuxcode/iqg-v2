/**
 * @file app/api/generate/route.ts
 * @description The ONLY backend endpoint of the app. Handles every request that
 * generates interview questions. Runs as a Vercel serverless function.
 * @module ApiGenerate
 * @author Mounssif BOUHLAOUI
 * @created 2026-05-25
 *
 * @story
 * This is the orchestrator. A request arrives from the browser with the user's
 * job title, type, difficulty, and any questions already shown to them. The
 * route runs five steps, in order, each cheaper than the next, to fail fast on
 * bad input before paying for an LLM call:
 *
 *   1. Parse the body with Zod  -> 400 if malformed
 *   2. Verify the HMAC cookie    -> 429 if over daily limit
 *   3. Sanitize the role string  -> 400 if dangerous chars / too long
 *   4. Validator LLM (Gemini 2.5 Flash-Lite, cheap classification)
 *        -> if invalid, return example job titles
 *   5. Main LLM (Gemini 2.5 Flash) generates 3 questions
 *        -> on failure, fall back to Gemini 2.5 Flash-Lite
 *        -> return JSON { questions: [q1, q2, q3] }
 *
 * The cookie is rotated on every response (success or 429) so the counter
 * stays in sync. We never store state on the server beyond the env vars.
 */

import { z } from "zod";
import { sanitizeInput } from "@/lib/sanitize";
import { validate, generateWithFallback } from "@/lib/llm";
import { buildMainPrompt, EXAMPLES } from "@/lib/prompts";
import { checkAndIncrement } from "@/lib/rate-limit";

/**
 * Zod schema for the POST body. Anything that doesn't match this shape
 * gets rejected with HTTP 400 before any logic runs.
 */
const Body = z.object({
  role: z.string().min(1).max(100),
  type: z.enum(["behavioral", "technical", "situational"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  exclude: z.array(z.string()).default([]),
  validated: z.boolean().optional(),
  forceBackup: z.boolean().optional(),
});

/** Name of the HttpOnly rate-limit cookie set on every response. */
const COOKIE_NAME = "iqg_rl";

/**
 * Extract a cookie value by name from the request's Cookie header.
 * Used instead of `next/headers cookies()` because this parser works in any
 * runtime (Node, Edge, test) without Next-specific context.
 *
 * @param {Request} req - The incoming request.
 * @param {string} name - Cookie name to look up.
 * @returns {string | undefined} Decoded cookie value, or undefined if absent.
 */
function getCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie") ?? "";
  for (const pair of header.split(";")) {
    const [k, v] = pair.trim().split("=");
    if (k === name) return decodeURIComponent(v);
  }
  return undefined;
}

/**
 * POST /api/generate
 *
 * Generates 3 interview questions for a given role, type, and difficulty.
 * Implements the 5-step pipeline described in the file @story.
 *
 * @param {Request} req - JSON body matching the `Body` Zod schema above.
 * @returns {Promise<Response>}
 *   - 200 with `{ questions: [...] }` on success
 *   - 200 with `{ valid: false, reason, examples }` when validator rejects
 *   - 400 with `{ error }` on malformed body or sanitize failure
 *   - 429 with `{ error, resetAt }` when over the daily rate limit
 *   - 502 with `{ error }` when both main and backup LLMs fail
 *
 * Always sets the `iqg_rl` cookie on the response (rotates the HMAC counter).
 */
export async function POST(req: Request) {
  // STEP 1 — Parse + validate the request body.
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  // STEP 2 — Rate-limit check. Cookie carries the counter; HMAC-signed so
  // the client can't forge it. We always send back a refreshed cookie.
  const rl = checkAndIncrement(getCookie(req, COOKIE_NAME));
  const setCookie = `${COOKIE_NAME}=${encodeURIComponent(rl.newCookie)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`;

  if (!rl.ok) {
    return Response.json(
      { error: "Daily limit reached", resetAt: rl.resetAt },
      { status: 429, headers: { "Set-Cookie": setCookie } },
    );
  }

  // STEP 3 — Sanitize the role: strip dangerous chars, reject obvious
  // prompt-injection patterns, enforce 100-char cap.
  let role: string;
  try {
    role = sanitizeInput(body.role);
  } catch (e) {
    return Response.json(
      { error: (e as Error).message },
      { status: 400, headers: { "Set-Cookie": setCookie } },
    );
  }

  // STEP 4 — Validator LLM. Skip if the client tells us this input was already
  // validated in a previous call (saves a Gemini call on "3 more" requests).
  if (!body.validated) {
    try {
      const v = await validate(role);
      if (!v.valid) {
        return Response.json(
          { valid: false, reason: v.reason, examples: EXAMPLES },
          { status: 200, headers: { "Set-Cookie": setCookie } },
        );
      }
    } catch (e) {
      // Validator SERVICE error (network, key revoked, etc.) — distinct from
      // model deciding the input is invalid. Surface the real message so the
      // user/dev sees what's actually broken instead of "that's not a job title".
      console.error("[validator-service]", (e as Error).message);
      return Response.json(
        { error: `Validator service error: ${(e as Error).message}` },
        { status: 502, headers: { "Set-Cookie": setCookie } },
      );
    }
  }

  // STEP 5 — Main LLM. The prompt builder includes the exclude block so the
  // model doesn't repeat questions already shown to the user.
  try {
    const result = await generateWithFallback({
      prompt: buildMainPrompt({
        role,
        type: body.type,
        difficulty: body.difficulty,
        exclude: body.exclude,
      }),
      forceBackup: body.forceBackup,
    });
    return Response.json(
      { questions: result.questions },
      {
        headers: {
          "Set-Cookie": setCookie,
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": String(rl.resetAt),
        },
      },
    );
  } catch (e) {
    // Both main and backup failed — surface the error to help the user retry.
    return Response.json(
      { error: `Generation failed: ${(e as Error).message}` },
      { status: 502, headers: { "Set-Cookie": setCookie } },
    );
  }
}
