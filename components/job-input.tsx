/**
 * @file components/job-input.tsx
 * @description Single-line text input where the user types the job title.
 * The entry point of the entire flow. Autofocused so mobile users see the
 * keyboard immediately on page load.
 * @module JobInput
 * @author Mounssif BOUHLAOUI
 * @created 2026-05-25
 *
 * @story
 * The brief specifies "Customer Success Manager" as the primary example —
 * that's the placeholder text. `maxLength={100}` is enforced at the
 * browser level on top of the server-side sanitizer (`lib/sanitize.ts`),
 * giving the user immediate feedback when they hit the cap.
 */

/**
 * Controlled text input for the job title.
 *
 * @param {object} props
 * @param {string} props.value - Current input value.
 * @param {(v: string) => void} props.onChange - Fires on every keystroke.
 * @param {boolean} [props.disabled] - When true, the input is read-only
 *   (used during loading to prevent edits mid-request).
 * @returns {JSX.Element}
 */
export function JobInput(props: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="role" className="text-sm font-medium text-neutral-700">
        Job title
      </label>
      <input
        id="role"
        type="text"
        autoFocus
        autoComplete="off"
        maxLength={100}
        placeholder="e.g. Customer Success Manager"
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.value)}
        className="min-h-[56px] rounded-xl border border-neutral-300 bg-white px-4 text-base placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 disabled:opacity-50"
      />
    </div>
  );
}
