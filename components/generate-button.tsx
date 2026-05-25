/**
 * @file components/generate-button.tsx
 * @description The big primary action button. Same component handles both
 * the initial "Generate 3 questions" state AND the morphed "Give me 3 more"
 * state — the parent supplies the right label and loadingLabel.
 * @module GenerateButton
 * @author Mounssif BOUHLAOUI
 * @created 2026-05-25
 *
 * @story
 * After the user generates their first 3 questions, this button changes
 * its label and behavior to act as "Give me 3 more". The button stays in
 * place — no disappearing buttons — so the loading spinner shows up where
 * the user is already looking.
 *
 * The spinner SVG is inlined (no Lucide / Heroicons dep) because it's
 * purely decorative and the project values zero-dep components where
 * possible. The button respects 56px minimum height — a comfortable
 * primary-action tap target on mobile.
 */

/**
 * Primary action button with built-in loading state.
 *
 * @param {object} props
 * @param {boolean} props.disabled - True to gray out the button (e.g. when
 *   input is empty or too short).
 * @param {boolean} props.loading - True to show the spinner + loadingLabel.
 *   When true, the button is also automatically disabled.
 * @param {() => void} props.onClick - Fires when the button is clicked.
 * @param {string} [props.label] - Idle-state label. Default: "Generate 3 questions".
 * @param {string} [props.loadingLabel] - Loading-state label. Default: "Generating your questions…".
 * @returns {JSX.Element}
 */
export function GenerateButton(props: {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
  label?: string;
  loadingLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled || props.loading}
      className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-base font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-neutral-400 disabled:shadow-none"
    >
      {props.loading ? (
        <>
          <Spinner />
          <span>{props.loadingLabel ?? "Generating your questions…"}</span>
        </>
      ) : (
        <span>{props.label ?? "Generate 3 questions"}</span>
      )}
    </button>
  );
}

/**
 * Inline 20×20 spinner used inside the button while loading.
 * Pure SVG, no dependency on an icon library.
 *
 * @returns {JSX.Element} An animated circular progress indicator.
 */
function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
