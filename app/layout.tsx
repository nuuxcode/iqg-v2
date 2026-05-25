/**
 * @file app/layout.tsx
 * @description Next.js root layout. Sets HTML lang, body styles, page
 * metadata, and viewport configuration. Wraps every route in the app.
 * @module RootLayout
 * @author Mounssif BOUHLAOUI
 * @created 2026-05-25
 *
 * @story
 * Next.js 15+ split `viewport` and `metadata` into separate exports — the
 * old pattern of putting viewport inside metadata is deprecated. Keeping
 * them split is the canonical 2026 pattern.
 *
 * `viewportFit: "cover"` extends the page into iPhone notch / Android
 * cutout safe areas. Required for proper mobile rendering on modern phones.
 *
 * `min-h-dvh` (dynamic viewport height) is used on the body to avoid layout
 * jumps on iOS Safari when the URL bar shows/hides. Don't use `min-h-screen`
 * here — it ties to `100vh` which doesn't account for browser chrome.
 */

import type { Metadata, Viewport } from "next";
import "./globals.css";

/** Page metadata applied to every route. */
export const metadata: Metadata = {
  title: "Interview Question Generator",
  description: "Generate 3 thoughtful interview questions for any role.",
};

/** Viewport config — separate export per Next.js 15+ convention. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Root layout component. Children = the active route's page.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - The page being rendered.
 * @returns {JSX.Element}
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-neutral-50 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
