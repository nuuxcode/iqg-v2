/**
 * @file components/history-drawer.tsx
 * @description Slide-in sidebar that shows the user's past question sets
 * (read from localStorage). Tap an entry to restore it into the main view.
 * Also has a "Clear all" button at the bottom.
 * @module HistoryDrawer
 * @author Mounssif BOUHLAOUI
 * @created 2026-05-25
 *
 * @story
 * The drawer owns its own data — it reads history fresh from localStorage
 * each time it opens. That means changes made by the parent (e.g. saving
 * a new question set) are visible the next time the user opens the drawer
 * without needing prop drilling.
 *
 * The "Clear all" footer only renders when there are items, to avoid an
 * empty bare button on the initial empty state. The empty state shows a
 * friendly "Nothing yet" message instead.
 *
 * The backdrop is `bg-black/40` with click-to-close — standard mobile
 * drawer behavior. The drawer itself is `w-[85vw] max-w-sm` which fits
 * comfortably on phones without covering the full screen.
 */

import { useEffect, useState } from "react";
import { loadHistory, clearHistory } from "@/lib/storage";
import type { QuestionSet } from "@/lib/types";

/**
 * Sliding history drawer. Controlled by the parent via `open` / `onClose`.
 *
 * @param {object} props
 * @param {boolean} props.open - Whether the drawer is visible.
 * @param {() => void} props.onClose - Called when the user taps the
 *   backdrop or the "Close" button.
 * @param {(set: QuestionSet) => void} props.onSelect - Called when the
 *   user taps a past entry. Parent should restore the questions to view.
 * @returns {JSX.Element | null} The drawer markup, or null when closed.
 */
export function HistoryDrawer(props: {
  open: boolean;
  onClose: () => void;
  onSelect: (set: QuestionSet) => void;
}) {
  const [items, setItems] = useState<QuestionSet[]>([]);

  // Re-load history every time the drawer opens — picks up any new entries
  // the parent saved while we were closed.
  useEffect(() => {
    if (props.open) setItems(loadHistory());
  }, [props.open]);

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop: tap-to-close. */}
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
