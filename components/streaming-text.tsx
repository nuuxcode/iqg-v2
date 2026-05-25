/**
 * @file components/streaming-text.tsx
 * @description Visual primitive for "this text is still being written".
 * Renders the text with a pulse animation and a thin vertical cursor at
 * the end. Used inside `QuestionCard` while a question is mid-stream.
 * @module StreamingText
 * @author Mounssif BOUHLAOUI
 * @created 2026-05-25
 *
 * @story
 * Currently UNUSED in production — we switched from `streamObject` to
 * `generateObject` and questions arrive fully-formed. The primitive
 * stays in the codebase because re-enabling streaming when the AI SDK
 * ships a working API is then a 1-line change in `app/page.tsx`.
 */

/**
 * Text span that animates while content is streaming in.
 *
 * @param {object} props
 * @param {string} props.text - Text to display.
 * @param {boolean} props.streaming - true = animated pulse + cursor,
 *   false = static black text.
 * @returns {JSX.Element}
 */
export function StreamingText(props: { text: string; streaming: boolean }) {
  return (
    <span className={props.streaming ? "animate-pulse text-neutral-700" : "text-neutral-900"}>
      {props.text}
      {props.streaming && <span className="ml-0.5 inline-block h-4 w-px bg-neutral-400 align-middle" />}
    </span>
  );
}
