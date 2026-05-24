"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

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

  const excludeForCombo = useMemo(
    () => (role ? getQuestionsForCombo(role, type, difficulty) : []),
    [role, type, difficulty],
  );

  const totalForCombo = excludeForCombo.length + questions.length;
  const moreDisabled = totalForCombo >= MAX_PER_COMBO;

  const submit = useCallback(
    async (mode: "fresh" | "more") => {
      setError(null);
      setLoading(true);
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
            role,
            type,
            difficulty,
            exclude: currentExclude,
            validated,
          }),
        });

        if (res.status === 429) {
          setError({ kind: "rate-limit", message: "You've used your daily quota. Comes back tomorrow." });
          return;
        }

        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
          const body = await res.json();
          if (body.valid === false) {
            setError({
              kind: "invalid",
              message: body.reason ?? "That doesn't look like a job role.",
              examples: body.examples ?? [],
            });
            return;
          }
          if (!res.ok) {
            setError({ kind: "llm-fail", message: body.error ?? "Generation failed." });
            return;
          }
        }

        if (!res.body) throw new Error("no body");
        setValidated(true);
        setStreaming(true);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          try {
            const parsed = JSON.parse(buffer);
            const qs = extractQuestions(parsed);
            const merged = isMore ? [...questions, ...qs] : qs;
            setQuestions(merged);
          } catch {
            // partial JSON - keep accumulating
          }
        }

        try {
          const final = JSON.parse(buffer);
          const finalQs = extractQuestions(final);
          const merged = isMore ? [...questions, ...finalQs] : finalQs;
          setQuestions(merged);
          if (merged.length === 3 || merged.length === 6) {
            saveQuestionSet({
              role,
              type,
              difficulty,
              questions: merged,
              generatedAt: Date.now(),
            });
          }
        } catch {
          setError({ kind: "llm-fail", message: "Couldn't parse the response." });
        }
      } catch {
        setError({ kind: "network", message: "Network error. Try again." });
      } finally {
        setLoading(false);
        setStreaming(false);
      }
    },
    [role, type, difficulty, validated, questions, excludeForCombo],
  );

  const restoreSet = (s: QuestionSet) => {
    setRole(s.role);
    setType(s.type);
    setDifficulty(s.difficulty);
    setQuestions(s.questions);
    setValidated(true);
  };

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5 px-4 pb-32 pt-6">
      <header className="flex items-center justify-between">
        <button
          onClick={() => setHistoryOpen(true)}
          className="min-h-[44px] rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium"
        >
          ☰ History
        </button>
        <h1 className="text-base font-semibold">IQG</h1>
      </header>

      <JobInput value={role} onChange={setRole} disabled={loading} />

      <SelectorGroup
        label="Type"
        value={type}
        onChange={setType}
        disabled={loading}
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
        disabled={loading}
        options={[
          { value: "easy", label: "Easy" },
          { value: "medium", label: "Medium" },
          { value: "hard", label: "Hard" },
        ]}
      />

      <GenerateButton
        disabled={role.trim().length === 0}
        loading={loading}
        onClick={() => submit("fresh")}
      />

      {error && (
        <ErrorBanner
          kind={error.kind}
          message={error.message}
          examples={error.kind === "invalid" ? error.examples : undefined}
          onRetry={error.kind !== "rate-limit" ? () => submit("fresh") : undefined}
        />
      )}

      {questions.length > 0 && (
        <div className="flex flex-col gap-3">
          {questions.map((q, i) => (
            <QuestionCard
              key={i}
              index={i + 1}
              text={q}
              streaming={streaming && i === questions.length - 1}
            />
          ))}
        </div>
      )}

      {questions.length > 0 && !loading && (
        <button
          onClick={() => submit("more")}
          disabled={moreDisabled}
          className="min-h-[56px] rounded-xl border-2 border-dashed border-brand-500 px-4 text-sm font-medium text-brand-600 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-400"
        >
          {moreDisabled
            ? "You've explored this combo deeply. Try a different type or difficulty."
            : "Give me 3 more"}
        </button>
      )}

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={restoreSet}
      />
    </main>
  );
}
