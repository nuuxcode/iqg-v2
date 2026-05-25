/**
 * @file components/selector-group.tsx
 * @description Generic segmented-control component used for BOTH the
 * Question Type selector (Behavioral / Technical / Situational) AND the
 * Difficulty selector (Easy / Medium / Hard). One component, two usages.
 * @module SelectorGroup
 * @author Mounssif BOUHLAOUI
 * @created 2026-05-25
 *
 * @story
 * Generic over `T extends string` so both selectors share the same code
 * with different option lists. Saves duplication.
 *
 * `aria-pressed={selected}` is the right ARIA pattern for toggle-button
 * groups. We don't use `<input type="radio">` because the visual is
 * button-y; screen readers correctly announce the press state.
 *
 * `min-h-[44px]` per Apple HIG — every selector option is a comfortable
 * thumb tap on mobile.
 */

/**
 * One choice in a selector group.
 * @template T - The string literal type for the value (e.g. "behavioral").
 */
interface Option<T extends string> {
  /** The internal value sent back to the parent on selection. */
  value: T;
  /** The human-readable label shown on the button. */
  label: string;
}

/**
 * Segmented-control selector. Single-selection only.
 *
 * @template T - Union of allowed option values (e.g. QuestionType).
 * @param {object} props
 * @param {string} props.label - Caption shown above the buttons.
 * @param {T} props.value - Currently-selected value.
 * @param {Option<T>[]} props.options - All available options.
 * @param {(v: T) => void} props.onChange - Fires when user picks a different option.
 * @param {boolean} [props.disabled] - When true, all buttons are dimmed and unclickable.
 * @returns {JSX.Element}
 */
export function SelectorGroup<T extends string>(props: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-neutral-700">{props.label}</legend>
      <div className="grid grid-cols-3 gap-2">
        {props.options.map((opt) => {
          const selected = opt.value === props.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={props.disabled}
              aria-pressed={selected}
              onClick={() => props.onChange(opt.value)}
              className={`min-h-[44px] rounded-lg border px-3 py-2 text-sm font-medium transition ${
                selected
                  ? "border-brand-600 bg-brand-500 text-white"
                  : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400"
              } disabled:opacity-50`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
