# Interview Question Generator (iqg-v2)

A mobile-first web app: type a job title, pick question type and difficulty, get 3 thoughtful, role-specific interview questions from an LLM. Tap "Give me 3 more" to extend without repeats.

**Live:** https://iqg-v2.vercel.app
**Repo:** https://github.com/nuuxcode/iqg-v2

---

## Features

### Core flow
- **Job title input** with a 100-char cap and a 3-char minimum (real-time hint)
- **Quick-pick chips** on the empty state — Customer Success Manager, Software Engineer, Product Manager — tap to populate the input
- **Type selector** — Behavioral / Technical / Situational
- **Difficulty selector** — Easy / Medium / Hard
- **Last-used type and difficulty** persist across visits (localStorage)
- **Loading state** inside the button itself — the button IS the spinner
- **3 questions rendered as cards**, mobile-readable typography

### Smart UX
- **Generate button morphs** to "Give me 3 more" after first generation; resets when input changes
- **"Give me 3 more"** sends previously-generated questions to the LLM as an exclude list — no repeats or paraphrases
- **15-question cap per `role + type + difficulty` combo** — button disables with a hint to try a different combo
- **Sticky scroll banner** appears at the top once the user scrolls past the form — tap role to scroll back, or tap "↻ 3 more" to regenerate without scrolling
- **History drawer** — sliding sidebar with past sessions; tap to restore a past question set
- **History merge logic** — clicking "3 more" updates the same history entry instead of duplicating it; changing role/type/difficulty starts a fresh entry

### LLM strategy
- **Two-stage cost pattern** — Gemini Flash Lite validates the input first (real job title or garbage?), then Gemini Flash generates the questions. Bad inputs get rejected without paying for the main call.
- **Main model = Flash, deliberately not Pro** — interview-question generation doesn't need frontier reasoning. It needs role knowledge, consistent structure, and speed. Flash gives all three at ~10× lower cost and ~3× faster than Pro. The real quality lever in this product is the prompt + exclude list, not the model size.
- **Backup model** — if the main fails, retries with Gemini Flash Lite. Same family, no second vendor, no second SDK.
- **Model names via env var** — swap any model with a dashboard change, no code edit
- **Skip re-validation on retry** — validated inputs are cached client-side; retries don't pay for a second validator call
- **Temperature tuned per call** — `0` for the deterministic validator, `0.7` for the creative generator

### Errors that guide instead of dead-end
- **Invalid input** → friendly banner with **clickable example chips** that fill the input on tap (not a useless "try again")
- **Rate-limit reached** → tells the user when they can come back
- **LLM failed** → simple retry, no jargon
- **Network error** → "check your connection and retry"
- **Mid-failure recovery** — backup model attempt is invisible to the user

### Safety & anti-abuse
- **HMAC-signed daily rate limit** — HttpOnly cookie, 10 generations per browser per day. No third-party service required.
- **Vercel $5 spend cap** — hard ceiling on cost if rate limiting fails or someone clears cookies to bypass
- **Input sanitization** — length cap, newline stripping, rejection of obvious prompt-injection patterns
- **Validator LLM** doubles as a second layer of injection defense
- **Output filter library** for prompt-leak detection (built and tested; route integration deferred to v1.1 — see Tradeoffs)
- **Zod schema** validates every API request body before any logic runs
- **All secrets server-only** — no `NEXT_PUBLIC_` API keys

### Mobile-first design
- **Built for 375px-wide phones first**, then enhanced for tablet and desktop
- **44px minimum tap targets** on every button per Apple HIG
- **`min-h-dvh`** for the dynamic viewport (no layout jumps on iOS Safari URL bar)
- **iOS tap-highlight disabled** for a native-app feel

### No-DB architecture
- **User identity** = client-generated UUID in localStorage (no auth, no fingerprint)
- **History** = localStorage, capped at 50 entries
- **Rate limit** = HMAC-signed cookie (no Redis, no Upstash)
- **Email/feedback** = deferred to v2 (no Resend or SMTP in v1)

---

## How it works (architecture)

```
[Browser]
   POST /api/generate {role, type, difficulty, exclude, validated}
        |
        v
[Next.js API route]
   1. Zod parse body                  -> 400 on malformed
   2. Verify HMAC cookie + increment  -> 429 if over daily limit
   3. Sanitize input                  -> 400 on bad chars / length
   4. Validator LLM (cheap)           -> 200 with examples if invalid
   5. Main LLM (Gemini Pro)
        on failure: Backup LLM
   6. Return {questions: [q1, q2, q3]}
        |
        v
[Browser]
   Render question cards
   Save to localStorage history (merge if same combo as top entry)
```

---

## Tech stack

- **Next.js 16** App Router
- **TypeScript** strict
- **Tailwind v4** with `@theme` directive
- **Vercel AI SDK v6** + `@ai-sdk/google`
- **Zod** for request validation
- **Vitest** for unit + integration tests
- **Vercel** for hosting

---

## Local development

```bash
pnpm install
cp .env.example .env.local
# Fill in GEMINI_API_KEY (https://aistudio.google.com/apikey)
# Fill in RATELIMIT_SECRET (openssl rand -hex 32)
pnpm dev
```

Open http://localhost:3000.

---

## Tests

```bash
pnpm test           # unit + integration (mocked Gemini, deterministic, fast)
pnpm test:smoke     # 7 real-Gemini tests, ~$0.05 per run
pnpm typecheck      # tsc --noEmit
```

60+ tests covering the rate-limit cookie, sanitizer, output filter, prompt builders, LLM wrapper (mocked), API route integration, and React components.

---

## Environment variables

| Name | Purpose | Required |
|---|---|---|
| `GEMINI_API_KEY` | Google AI Studio key | yes |
| `GEMINI_MODEL_VALIDATOR` | cheap model for input validation | yes |
| `GEMINI_MODEL_MAIN` | main model for question generation | yes |
| `GEMINI_MODEL_BACKUP` | fallback if main fails | yes |
| `RATELIMIT_SECRET` | 32-byte hex string for HMAC cookie | yes |
| `DAILY_LIMIT` | requests per day per user (default 10) | no |

Current values: validator `gemini-2.5-flash-lite` / main `gemini-2.5-flash` / backup `gemini-2.5-flash-lite`. Single-family stack for simplicity. Swap to `gemini-3.x` in the Vercel dashboard if you want preview-grade quality.

---

## Tradeoffs (what I'd add for production)

- **Real rate limiting** via Upstash through the Vercel Marketplace — the current HMAC cookie is bypassable by clearing storage. The Vercel $5 spend cap is the hard wall today.
- **Wire the output filter** (already built in `lib/output-filter.ts`, with tests) into the route — catches prompt-leak patterns in LLM output. One-line integration, deferred to v1.1.
- **Real streaming UX** — `streamObject` from AI SDK v6 returns 0 bytes in production. The streaming UI primitives (`StreamingText`, `streaming` prop on cards) are in the codebase ready to reconnect when the API stabilizes.
- **Feedback + Report buttons** with email delivery via Resend (deferred to v2).
- **Sentry** for production error tracking.
- **A/B testing** the main prompt to measure question quality per role.
- **Cross-device history** via Neon Postgres once auth is added.

---

## License

MIT
