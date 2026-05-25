/**
 * @file components/error-banner.tsx
 * @description A single component that renders all 4 error kinds the app
 * can produce. Smart about WHICH UI elements to show based on the kind
 * (clickable examples for invalid input, retry link for transient failures,
 * just-a-message for rate-limit).
 * @module ErrorBanner
 * @author Mounssif BOUHLAOUI
 * @created 2026-05-25
 *
 * @story
 * Every error in the app routes through this component. The four kinds:
 *
 *   - "invalid"    — validator LLM rejected the input. Shows clickable
 *                    example chips that fill the input on tap. NO retry
 *                    link (retrying the same bad input is pointless).
 *   - "rate-limit" — user hit the daily cap. NO retry link (waiting until
 *                    tomorrow is the only option).
 *   - "llm-fail"   — main and backup both errored. Retry link IS shown.
 *   - "network"    — fetch failed. Retry link IS shown.
 *
 * Examples render as buttons IF `onUseExample` is provided, plain spans
 * otherwise. Same component, different presentation based on context.
 */

/**
 * Renders an error banner appropriate to the error kind.
 *
 * @param {object} props
 * @param {"invalid" | "rate-limit" | "llm-fail" | "network"} props.kind - Error category.
 * @param {string} props.message - Human-readable error message.
 * @param {readonly string[]} [props.examples] - Example job titles to show
 *   (only for `invalid` errors). Rendered as buttons if `onUseExample` is
 *   provided, plain spans otherwise.
 * @param {(ex: string) => void} [props.onUseExample] - Fires when the user
 *   taps an example chip. Parent should fill the input with the chosen value.
 * @param {() => void} [props.onRetry] - Fires when the user taps "Try again".
 *   Hidden for `invalid` errors even if provided.
 * @returns {JSX.Element}
 */
export function ErrorBanner(props: {
  kind: "invalid" | "rate-limit" | "llm-fail" | "network";
  message: string;
  examples?: readonly string[];
  onUseExample?: (ex: string) => void;
  onRetry?: () => void;
}) {
  // Retry link is hidden for "invalid" errors — the user must change input,
  // not just retry with the same bad value.
  const showRetry = props.onRetry && props.kind !== "invalid";
  return (
    <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
      <p className="font-medium leading-relaxed">{props.message}</p>
      {props.examples && props.examples.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {props.examples.map((ex) =>
            props.onUseExample ? (
              <button
                key={ex}
                type="button"
                onClick={() => props.onUseExample!(ex)}
                className="min-h-[36px] rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-900 transition hover:border-red-500 hover:bg-red-100"
              >
                {ex}
              </button>
            ) : (
              <span
                key={ex}
                className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs"
              >
                {ex}
              </span>
            ),
          )}
        </div>
      )}
      {showRetry && (
        <button
          type="button"
          onClick={props.onRetry}
          className="mt-3 text-sm font-medium underline underline-offset-2"
        >
          Try again
        </button>
      )}
    </div>
  );
}
