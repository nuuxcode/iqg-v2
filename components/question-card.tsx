/**
 * @file components/question-card.tsx
 * @description One generated interview question, rendered as a card with a
 * numbered chip (Q1 / Q2 / Q3...). Optionally shows a streaming pulse if
 * the question is still being written (currently unused — see story).
 * @module QuestionCard
 * @author Mounssif BOUHLAOUI
 * @created 2026-05-25
 *
 * @story
 * The streaming primitives are kept ready for a future re-enable of
 * token-by-token UX. Right now `streaming` is always false in production
 * because we switched from `streamObject` (broken in AI SDK v6) to
 * `generateObject`. When AI SDK ships a working streaming API, flipping
 * `streaming={true}` on the last in-flight card re-enables the visual.
 */

import { StreamingText } from "./streaming-text";

/**
 * One question in the result list. Renders a numbered chip + the text.
 *
 * @param {object} props
 * @param {number} props.index - 1-based question number (Q1, Q2, Q3, ...).
 * @param {string} props.text - The question itself.
 * @param {boolean} [props.streaming] - When true, applies a pulsing text
 *   animation + cursor to indicate the question is still being written.
 * @returns {JSX.Element}
 */
export function QuestionCard(props: {
  index: number;
  text: string;
  streaming?: boolean;
}) {
  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
          Q{props.index}
        </span>
        <p className="flex-1 text-base leading-relaxed">
          <StreamingText text={props.text} streaming={!!props.streaming} />
        </p>
      </div>
    </article>
  );
}
