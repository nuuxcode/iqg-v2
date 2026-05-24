# Interview Question Generator (iqg-v2)

A mobile-first web app: enter any job title, pick a question type and difficulty, get 3 thoughtful interview questions tailored to that role. Tap "Give me 3 more" to extend without repeats.

## How it works

```
[Browser] -> POST /api/generate -> [Cookie rate-limit (HMAC-signed)]
                                -> [Gemini Flash Lite (validator)]
                                   if invalid: return example job titles
                                -> [Gemini Pro stream]
                                   on failure: [Gemini Flash backup]
                                <- streaming JSON {"questions":["q1","q2","q3"]}
```

- **No database.** History lives in `localStorage`. User identity is a `localStorage` UUID.
- **No third-party services beyond Gemini.** Rate limiting is HMAC-signed HttpOnly cookies. Bypassable by clearing cookies, but the Vercel $5 spend cap is the real safety net.
- **Mobile-first.** Built for 375px-wide phones first, then enhanced for desktop.
- **Streaming.** Questions appear word-by-word as the LLM generates them.

## Tech stack

- Next.js 16 App Router
- TypeScript strict
- Tailwind v4
- Vercel AI SDK v6 + `@ai-sdk/google`
- Zod for request validation
- Vitest for unit + integration tests

## Local development

```bash
pnpm install
cp .env.example .env.local
# Fill in GEMINI_API_KEY (https://aistudio.google.com/apikey)
# Fill in RATELIMIT_SECRET (openssl rand -hex 32)
pnpm dev
```

Open http://localhost:3000.

## Tests

```bash
pnpm test           # unit + integration (mocked Gemini, deterministic, fast)
pnpm test:smoke     # 7 real-Gemini tests, ~$0.05 per run
pnpm typecheck      # tsc --noEmit
```

## Environment variables

| Name | Purpose | Required |
|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio key | yes |
| `GEMINI_MODEL_VALIDATOR` | cheap model for input validation | yes |
| `GEMINI_MODEL_MAIN` | main model for question generation | yes |
| `GEMINI_MODEL_BACKUP` | fallback if main fails | yes |
| `RATELIMIT_SECRET` | 32-byte hex string for HMAC cookie | yes |
| `DAILY_LIMIT` | requests per day per user (default 10) | no |

Dev defaults: `gemini-2.5-flash-lite` / `gemini-2.5-pro` / `gemini-2.5-flash`.
Production swap: `gemini-3.1-flash-lite` / `gemini-3.1-pro` / `gemini-3.1-flash`.

## Tradeoffs (what I'd add for production)

- **Real rate limiting** via Upstash Marketplace install. The current cookie approach is bypassable by clearing cookies; we rely on a Vercel spend cap as the hard ceiling.
- **Feedback + Report buttons** with Resend email integration (deferred to v2).
- **Sentry** for production error tracking.
- **A/B testing** the prompt to optimize question quality across roles.
- **Cross-device history** via a real DB once auth is added.

See `docs/build-history/` for the full decision log (entries 001-009).

## License

MIT
