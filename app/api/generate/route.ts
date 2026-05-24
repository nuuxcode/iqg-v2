import { z } from "zod";
import { sanitizeInput } from "@/lib/sanitize";
import { validate, generateWithFallback } from "@/lib/llm";
import { buildMainPrompt, EXAMPLES } from "@/lib/prompts";
import { checkAndIncrement } from "@/lib/rate-limit";

const Body = z.object({
  role: z.string().min(1).max(100),
  type: z.enum(["behavioral", "technical", "situational"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  exclude: z.array(z.string()).default([]),
  validated: z.boolean().optional(),
  forceBackup: z.boolean().optional(),
});

const COOKIE_NAME = "iqg_rl";

function getCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie") ?? "";
  for (const pair of header.split(";")) {
    const [k, v] = pair.trim().split("=");
    if (k === name) return decodeURIComponent(v);
  }
  return undefined;
}

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rl = checkAndIncrement(getCookie(req, COOKIE_NAME));
  const setCookie = `${COOKIE_NAME}=${encodeURIComponent(rl.newCookie)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`;

  if (!rl.ok) {
    return Response.json(
      { error: "Daily limit reached", resetAt: rl.resetAt },
      { status: 429, headers: { "Set-Cookie": setCookie } },
    );
  }

  let role: string;
  try {
    role = sanitizeInput(body.role);
  } catch (e) {
    return Response.json(
      { error: (e as Error).message },
      { status: 400, headers: { "Set-Cookie": setCookie } },
    );
  }

  if (!body.validated) {
    const v = await validate(role);
    if (!v.valid) {
      return Response.json(
        { valid: false, reason: v.reason, examples: EXAMPLES },
        { status: 200, headers: { "Set-Cookie": setCookie } },
      );
    }
  }

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
    return Response.json(
      { error: `Generation failed: ${(e as Error).message}` },
      { status: 502, headers: { "Set-Cookie": setCookie } },
    );
  }
}
