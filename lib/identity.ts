/**
 * @file lib/identity.ts
 * @description Lazy-creates a UUID in localStorage on first visit. This is
 * the app's only "user identity" — no auth, no fingerprint, no cookies.
 * Client-only.
 * @module Identity
 * @author Mounssif BOUHLAOUI
 * @created 2026-05-25
 *
 * @story
 * The brief asked for "open to the public, no DB". So instead of auth we
 * generate a UUID v4 on the user's first visit and store it in localStorage.
 * It persists until the user clears their browser data.
 *
 * The UUID is NOT used for rate limiting (that's a server-signed cookie).
 * It's only used by the history layer to scope sessions to a browser.
 *
 * The SSR guard at the top is critical — Next.js renders this code on the
 * server during the first paint, where `window` / `localStorage` don't
 * exist. We return an empty string in that case; the real ID is read
 * inside `useEffect` on the client.
 */

/** localStorage key under which the UUID is stored. */
const KEY = "iqg_userId";

/**
 * Returns the user's UUID, creating one if it doesn't exist.
 * Safe to call on the server (returns empty string).
 *
 * @returns {string} The user's UUID, or `""` during SSR.
 */
export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
