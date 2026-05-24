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
        placeholder="e.g. Software Engineer, Product Manager…"
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.value)}
        className="min-h-[56px] rounded-xl border border-neutral-300 bg-white px-4 text-base placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 disabled:opacity-50"
      />
    </div>
  );
}
