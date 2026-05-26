/**
 * @file app/page.tsx
 * @description The ONLY page in the app. Orchestrates every interaction:
 * input + selectors + Generate button + question rendering + History drawer
 * + sticky scroll banner + error display. Marked `"use client"` because
 * it owns React state, event handlers, and `IntersectionObserver`.
 * @module Page
 * @author Mounssif BOUHLAOUI
 * @created 2026-05-25
 *
 * @story
 * State graph (each piece exists for a specific reason):
 *
 *   role              - the user's current input
 *   type, difficulty  - the selectors (persisted to localStorage so they
 *                       survive page reloads)
 *   questions         - the generated questions (cleared on input change)
 *   loadingMode       - "fresh" | "more" | null. Three-state because the top
 *                       button and the bottom button can each show their own
 *                       spinner, depending on which click triggered the load
 *   validated         - flag to skip re-validation on retry calls (saves a
 *                       Gemini call when the user clicks "3 more")
 *   error             - discriminated union, each variant carries its own
 *                       fields (examples for "invalid", retry for "llm-fail")
 *   historyOpen       - drawer toggle
 *   showStickyBar     - true when the user has scrolled past the form;
 *                       driven by IntersectionObserver on a sentinel div
 *
 * Effects:
 *   - On mount: create userId UUID, restore last-used type + difficulty
 *   - On type/difficulty change: persist to localStorage
 *   - On role/type/difficulty change: reset session (clear questions, error,
 *     validated flag) — this is what makes "input changes resets the button
 *     back to Generate 3 questions"
 *   - On mount: wire IntersectionObserver to the sentinel for the sticky bar
 *
 * The main `submit()` callback is the only orchestration logic. Everything
 * else is event handlers and rendering.
 */

"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { JobInput } from "@/components/job-input";
import { SelectorGroup } from "@/components/selector-group";
import { GenerateButton } from "@/components/generate-button";
import { QuestionCard } from "@/components/question-card";
import { ErrorBanner } from "@/components/error-banner";
import { HistoryDrawer } from "@/components/history-drawer";
import { getOrCreateUserId } from "@/lib/identity";
import { saveQuestionSet, getQuestionsForCombo } from "@/lib/storage";
import { extractQuestions } from "@/lib/stream-parser";
import type { QuestionType, Difficulty, QuestionSet } from "@/lib/types";

/** Hard cap on questions for one role+type+difficulty combo. After this,
 * LLM quality drops as the exclude list grows; we disable "3 more" with
 * a hint to try a different combo. */
const MAX_PER_COMBO = 15;

/** Minimum role-input length before the Generate button enables. */
const MIN_ROLE_LEN = 3;

/** Quick-pick chips shown under the input on the empty state.
 *  Customer Success Manager is FIRST because it's the brief's primary example. */
const QUICK_PICKS = [
  "Customer Success Manager",
  "Software Engineer",
  "Product Manager",
] as const;

/** Human-readable labels for the sticky bar (which shows "Behavioral · Medium" etc.). */
const TYPE_LABEL: Record<QuestionType, string> = {
  behavioral: "Behavioral",
  technical: "Technical",
  situational: "Situational",
};
const DIFF_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

/** Discriminated union of error states. Each variant carries exactly the
 *  fields its display needs — no optional fields, no nullable bag. */
type ErrorState =
  | { kind: "invalid"; message: string; examples: readonly string[] }
  | { kind: "rate-limit"; message: string }
  | { kind: "llm-fail"; message: string }
  | { kind: "network"; message: string };

/**
 * The main app page. Renders the entire single-page UI.
 *
 * @returns {JSX.Element}
 */
export default function Page() {
  // === State ===
  const [role, setRole] = useState("");
  const [type, setType] = useState<QuestionType>("behavioral");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [questions, setQuestions] = useState<string[]>([]);
  const [loadingMode, setLoadingMode] = useState<"fresh" | "more" | null>(null);
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const isLoading = loadingMode !== null;

  // === Mount effects ===

  /** Create UUID identity + restore persisted selectors on first render. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    getOrCreateUserId();
    const t = localStorage.getItem("iqg_lastType") as QuestionType | null;
    const d = localStorage.getItem("iqg_lastDiff") as Difficulty | null;
    if (t) setType(t);
    if (d) setDifficulty(d);
  }, []);

  /** Persist Type selector across visits. */
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("iqg_lastType", type);
  }, [type]);

  /** Persist Difficulty selector across visits. */
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("iqg_lastDiff", difficulty);
  }, [difficulty]);

  /** When set true, the next [role/type/difficulty] effect run is treated as
   *  a programmatic restore (from history) and skips the reset. Without this,
   *  restoring a history entry would immediately wipe the questions it just
   *  set, because changing role/type/difficulty triggers the reset effect. */
  const isRestoring = useRef(false);

  /** Reset the session whenever the user changes role / type / difficulty.
   *  This is how the top button "snaps back" from "Give me 3 more" to
   *  "Generate 3 questions" when the user changes the input.
   *
   *  Skipped when isRestoring is set, so history-tap doesn't wipe the
   *  restored questions. */
  useEffect(() => {
    if (isRestoring.current) {
      isRestoring.current = false;
      return;
    }
    setValidated(false);
    setQuestions([]);
    setError(null);
  }, [role, type, difficulty]);

  /** Sticky-bar trigger. The sentinel div sits right below the Generate
   *  button; when it scrolls above the viewport, the bar appears. */
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        setShowStickyBar(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, []);

  // === Derived state ===

  /** All previously-asked questions for this combo (across all history
   *  entries, deduped). Sent to the LLM as the exclude block. */
  const excludeForCombo = useMemo(
    () => (role ? getQuestionsForCombo(role, type, difficulty) : []),
    [role, type, difficulty],
  );

  const totalForCombo = excludeForCombo.length + questions.length;
  const moreDisabled = totalForCombo >= MAX_PER_COMBO;

  const trimmedRole = role.trim();
  const tooShort = trimmedRole.length > 0 && trimmedRole.length < MIN_ROLE_LEN;
  const canSubmit = trimmedRole.length >= MIN_ROLE_LEN;

  // === Actions ===

  /**
   * The only function that talks to the API. Used by both the top button
   * (mode="fresh") and the "3 more" button (mode="more").
   *
   * @param {"fresh" | "more"} mode - "fresh" clears questions and re-validates.
   *   "more" appends to the existing list and sends the exclude block.
   */
  const submit = useCallback(
    async (mode: "fresh" | "more") => {
      if (!canSubmit || isLoading) return;
      setError(null);
      setLoadingMode(mode);
      const isMore = mode === "more";
      const currentExclude = isMore
        ? [...excludeForCombo, ...questions]
        : excludeForCombo;
      if (!isMore) setQuestions([]);

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            role: trimmedRole,
            type,
            difficulty,
            exclude: currentExclude,
            validated,
          }),
        });

        // 429 = rate-limited. No retry option — wait until tomorrow.
        if (res.status === 429) {
          setError({
            kind: "rate-limit",
            message: "You've used your daily question quota. Come back tomorrow.",
          });
          return;
        }

        const body = await res.json();

        // Validator rejected — surface examples for the user to tap.
        if (body.valid === false) {
          setError({
            kind: "invalid",
            message: "That doesn't look like a job title yet. Tap one below or type a real role:",
            examples: body.examples ?? [],
          });
          return;
        }

        // Any other non-OK response = LLM-side failure.
        // Surface the server's actual error message instead of a generic line
        // so a revoked key, network issue, or model outage is debuggable from
        // the UI alone (backend.md: ALWAYS propagate backend error messages).
        if (!res.ok) {
          setError({
            kind: "llm-fail",
            message: body.error ?? "Couldn't generate questions right now. Wait a few seconds and try again.",
          });
          return;
        }

        // Success — render questions and persist to history.
        setValidated(true);
        const newQs = extractQuestions(body);
        const merged = isMore ? [...questions, ...newQs] : newQs;
        setQuestions(merged);
        if (merged.length > 0) {
          saveQuestionSet({
            role: trimmedRole,
            type,
            difficulty,
            questions: merged,
            generatedAt: Date.now(),
          });
        }
      } catch {
        // Network / parsing / unexpected error.
        setError({
          kind: "network",
          message: "Couldn't reach the server. Check your connection and retry.",
        });
      } finally {
        setLoadingMode(null);
      }
    },
    [canSubmit, isLoading, trimmedRole, type, difficulty, validated, questions, excludeForCombo],
  );

  /**
   * Restore a past session from the History drawer. Sets all the form
   * fields + questions to match, and flags `validated=true` so the next
   * "3 more" click doesn't re-pay for validation.
   *
   * @param {QuestionSet} s - History entry the user tapped.
   */
  const restoreSet = (s: QuestionSet) => {
    // Flag so the reset effect (triggered by role/type/difficulty change)
    // skips its wipe — otherwise the questions we set below get cleared
    // before they ever render.
    isRestoring.current = true;
    setRole(s.role);
    setType(s.type);
    setDifficulty(s.difficulty);
    setQuestions(s.questions);
    setValidated(true);
    setError(null);
  };

  /**
   * Fill the input with a quick-pick or example value. Also clears any
   * existing error so the user sees a clean form.
   *
   * @param {string} ex - The example string to use as the new input value.
   */
  const useExample = (ex: string) => {
    setRole(ex);
    setError(null);
  };

  /** Smooth-scroll back to the top. Triggered by tapping the role in the sticky bar. */
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Sticky scroll banner: appears once the user scrolls past the form.
          Lets them regenerate without scrolling back up. */}
      {showStickyBar && canSubmit && (
        <div className="fixed inset-x-0 top-0 z-30 border-b border-neutral-200 bg-white/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-xl items-center gap-2 px-3 py-2">
            <button
              onClick={scrollToTop}
              className="flex min-w-0 flex-1 flex-col items-start rounded-lg px-2 py-1 text-left hover:bg-neutral-100"
            >
              <span className="w-full truncate text-sm font-medium text-neutral-900">
                {trimmedRole}
              </span>
              <span className="text-xs text-neutral-500">
                {TYPE_LABEL[type]} · {DIFF_LABEL[difficulty]}
              </span>
            </button>
            {questions.length > 0 ? (
              <button
                onClick={() => submit("more")}
                disabled={isLoading || moreDisabled}
                className="flex min-h-[40px] items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:bg-neutral-400"
              >
                {loadingMode === "more" ? (
                  <>
                    <MiniSpinner />
                    <span>…</span>
                  </>
                ) : (
                  <span>↻ 3 more</span>
                )}
              </button>
            ) : (
              <button
                onClick={() => submit("fresh")}
                disabled={isLoading}
                className="flex min-h-[40px] items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:bg-neutral-400"
              >
                {loadingMode === "fresh" ? <MiniSpinner /> : <span>Generate</span>}
              </button>
            )}
          </div>
        </div>
      )}

      <main className="mx-auto flex max-w-xl flex-col gap-5 px-4 pb-32 pt-6">
        {/* Header with History button (left) + app title (right) */}
        <header className="flex items-center justify-between">
          <button
            onClick={() => setHistoryOpen(true)}
            className="min-h-[44px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium"
          >
            ☰ History
          </button>
          <h1 className="text-base font-semibold">Interview Questions</h1>
        </header>

        {/* Input + min-length hint + empty-state quick-picks */}
        <div className="flex flex-col gap-1">
          <JobInput value={role} onChange={setRole} disabled={isLoading} />
          {tooShort && (
            <p className="text-xs text-neutral-500">
              Type at least {MIN_ROLE_LEN} characters.
            </p>
          )}
          {!role && questions.length === 0 && (
            <div className="mt-1 flex flex-wrap gap-2">
              <span className="text-xs text-neutral-500">Try:</span>
              {QUICK_PICKS.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => useExample(ex)}
                  className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs font-medium text-neutral-700 hover:border-brand-500 hover:text-brand-600"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Type + Difficulty selectors */}
        <SelectorGroup
          label="Type"
          value={type}
          onChange={setType}
          disabled={isLoading}
          options={[
            { value: "behavioral", label: "Behavioral" },
            { value: "technical", label: "Technical" },
            { value: "situational", label: "Situational" },
          ]}
        />

        <SelectorGroup
          label="Difficulty"
          value={difficulty}
          onChange={setDifficulty}
          disabled={isLoading}
          options={[
            { value: "easy", label: "Easy" },
            { value: "medium", label: "Medium" },
            { value: "hard", label: "Hard" },
          ]}
        />

        {/* Main Generate button — morphs to "Give me 3 more" after first generation */}
        <GenerateButton
          disabled={!canSubmit || isLoading || (questions.length > 0 && moreDisabled)}
          loading={questions.length > 0 ? loadingMode === "more" : loadingMode === "fresh"}
          onClick={() => submit(questions.length > 0 ? "more" : "fresh")}
          label={
            questions.length === 0
              ? "Generate 3 questions"
              : moreDisabled
              ? "You've explored this combo. Try a different type or difficulty."
              : "Give me 3 more"
          }
          loadingLabel={questions.length > 0 ? "Generating 3 more…" : "Generating your questions…"}
        />

        {/* Sentinel for the sticky-bar IntersectionObserver. Invisible. */}
        <div ref={sentinelRef} aria-hidden />

        {/* Error banner — kind-aware behavior */}
        {error && (
          <ErrorBanner
            kind={error.kind}
            message={error.message}
            examples={error.kind === "invalid" ? error.examples : undefined}
            onUseExample={error.kind === "invalid" ? useExample : undefined}
            onRetry={
              error.kind === "llm-fail" || error.kind === "network"
                ? () => submit("fresh")
                : undefined
            }
          />
        )}

        {/* Generated questions */}
        {questions.length > 0 && (
          <div className="flex flex-col gap-3">
            {questions.map((q, i) => (
              <QuestionCard key={i} index={i + 1} text={q} />
            ))}
          </div>
        )}

        {/* Bottom "Give me 3 more" button — in context with the questions */}
        {questions.length > 0 && (
          <button
            onClick={() => submit("more")}
            disabled={moreDisabled || isLoading}
            className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-500 px-4 text-sm font-medium text-brand-600 transition hover:bg-brand-500/5 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-400"
          >
            {loadingMode === "more" ? (
              <>
                <MiniSpinner />
                <span>Generating 3 more…</span>
              </>
            ) : moreDisabled ? (
              <span>You&apos;ve explored this combo deeply. Try a different type or difficulty.</span>
            ) : (
              <span>Give me 3 more</span>
            )}
          </button>
        )}

        {/* History drawer (slides in from left when opened) */}
        <HistoryDrawer
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          onSelect={restoreSet}
        />
      </main>
    </>
  );
}

/**
 * Small 16×16 spinner used inside the sticky-bar button and the
 * bottom "Give me 3 more" button. Pure SVG, no icon-lib dependency.
 *
 * @returns {JSX.Element}
 */
function MiniSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
