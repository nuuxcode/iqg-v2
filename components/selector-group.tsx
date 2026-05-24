interface Option<T extends string> {
  value: T;
  label: string;
}

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
