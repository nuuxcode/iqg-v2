import { StreamingText } from "./streaming-text";

export function QuestionCard(props: {
  index: number;
  text: string;
  streaming?: boolean;
}) {
  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
          Q{props.index}
        </span>
        <p className="flex-1 text-base leading-relaxed">
          <StreamingText text={props.text} streaming={!!props.streaming} />
        </p>
      </div>
    </article>
  );
}
