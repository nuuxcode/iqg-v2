export function ErrorBanner(props: {
  kind: "invalid" | "rate-limit" | "llm-fail" | "network";
  message: string;
  examples?: readonly string[];
  onUseExample?: (ex: string) => void;
  onRetry?: () => void;
}) {
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
