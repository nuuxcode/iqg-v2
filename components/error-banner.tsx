export function ErrorBanner(props: {
  kind: "invalid" | "rate-limit" | "llm-fail" | "network";
  message: string;
  examples?: readonly string[];
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
      <p className="font-medium">{props.message}</p>
      {props.examples && props.examples.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {props.examples.map((ex) => (
            <span key={ex} className="rounded-md bg-white px-2 py-1 text-xs">
              {ex}
            </span>
          ))}
        </div>
      )}
      {props.onRetry && (
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
