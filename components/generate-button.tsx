export function GenerateButton(props: {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
  label?: string;
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
          <span>Thinking…</span>
        </>
      ) : (
        <span>{props.label ?? "Generate 3 questions"}</span>
      )}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
