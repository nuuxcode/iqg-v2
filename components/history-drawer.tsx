import { useEffect, useState } from "react";
import { loadHistory, clearHistory } from "@/lib/storage";
import type { QuestionSet } from "@/lib/types";

export function HistoryDrawer(props: {
  open: boolean;
  onClose: () => void;
  onSelect: (set: QuestionSet) => void;
}) {
  const [items, setItems] = useState<QuestionSet[]>([]);

  useEffect(() => {
    if (props.open) setItems(loadHistory());
  }, [props.open]);

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={props.onClose}
        aria-hidden
      />
      <aside className="relative ml-0 flex h-full w-[85vw] max-w-sm flex-col bg-white shadow-xl">
        <header className="flex items-center justify-between border-b p-4">
          <h2 className="text-base font-semibold">History</h2>
          <button onClick={props.onClose} className="text-sm text-neutral-500">
            Close
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="p-4 text-sm text-neutral-500">
              Nothing yet — generate your first set!
            </p>
          ) : (
            items.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  props.onSelect(s);
                  props.onClose();
                }}
                className="block w-full rounded-lg p-3 text-left hover:bg-neutral-100"
              >
                <div className="font-medium text-neutral-900">{s.role}</div>
                <div className="text-xs text-neutral-500">
                  {s.type} · {s.difficulty} · {s.questions.length} questions
                </div>
              </button>
            ))
          )}
        </div>
        {items.length > 0 && (
          <footer className="border-t p-3">
            <button
              onClick={() => {
                clearHistory();
                setItems([]);
              }}
              className="text-xs text-red-600"
            >
              Clear all
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
