"use client";

export function StreamingText(props: { text: string; streaming: boolean }) {
  return (
    <span className={props.streaming ? "animate-pulse text-neutral-700" : "text-neutral-900"}>
      {props.text}
      {props.streaming && <span className="ml-0.5 inline-block h-4 w-px bg-neutral-400 align-middle" />}
    </span>
  );
}
