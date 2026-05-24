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

const MAX_PER_COMBO = 15;
const MIN_ROLE_LEN = 3;
const QUICK_PICKS = [
  "Customer Success Manager",
  "Software Engineer",
  "Product Manager",
] as const;

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

type ErrorState =
  | { kind: "invalid"; message: string; examples: readonly string[] }
  | { kind: "rate-limit"; message: string }
  | { kind: "llm-fail"; message: string }
  | { kind: "network"; message: string };

export default function Page() {
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    getOrCreateUserId();
    const t = localStorage.getItem("iqg_lastType") as QuestionType | null;
    const d = localStorage.getItem("iqg_lastDiff") as Difficulty | null;
    if (t) setType(t);
    if (d) setDifficulty(d);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("iqg_lastType", type);
  }, [type]);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("iqg_lastDiff", difficulty);
  }, [difficulty]);

  useEffect(() => {
    setValidated(false);
    setQuestions([]);
    setError(null);
  }, [role, type, difficulty]);

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

  const excludeForCombo = useMemo(
    () => (role ? getQuestionsForCombo(role, type, difficulty) : []),
    [role, type, difficulty],
  );

  const totalForCombo = excludeForCombo.length + questions.length;
  const moreDisabled = totalForCombo >= MAX_PER_COMBO;

  const trimmedRole = role.trim();
  const tooShort = trimmedRole.length > 0 && trimmedRole.length < MIN_ROLE_LEN;
  const canSubmit = trimmedRole.length >= MIN_ROLE_LEN;

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

        if (res.status === 429) {
          setError({
            kind: "rate-limit",
            message: "You've used your daily question quota. Come back tomorrow.",
          });
          return;
        }

        const body = await res.json();

        if (body.valid === false) {
          setError({
            kind: "invalid",
            message: "That doesn't look like a job title yet. Tap one below or type a real role:",
            examples: body.examples ?? [],
          });
          return;
        }
        if (!res.ok) {
          setError({
            kind: "llm-fail",
            message: "Couldn't generate questions right now. Wait a few seconds and try again.",
          });
          return;
        }

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

  const restoreSet = (s: QuestionSet) => {
    setRole(s.role);
    setType(s.type);
    setDifficulty(s.difficulty);
    setQuestions(s.questions);
    setValidated(true);
  };

  const useExample = (ex: string) => {
    setRole(ex);
    setError(null);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
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
        <header className="flex items-center justify-between">
          <button
            onClick={() => setHistoryOpen(true)}
            className="min-h-[44px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium"
          >
            ☰ History
          </button>
          <h1 className="text-base font-semibold">Interview Questions</h1>
        </header>

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

        <GenerateButton
          disabled={!canSubmit || isLoading}
          loading={loadingMode === "fresh"}
          onClick={() => submit("fresh")}
        />

        <div ref={sentinelRef} aria-hidden />

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

        {questions.length > 0 && (
          <div className="flex flex-col gap-3">
            {questions.map((q, i) => (
              <QuestionCard key={i} index={i + 1} text={q} />
            ))}
          </div>
        )}

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

        <HistoryDrawer
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          onSelect={restoreSet}
        />
      </main>
    </>
  );
}

function MiniSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
