import Link from "next/link";
import { AuthCanvasPane } from "@/app/components/auth/AuthCanvasPane";
import { AuthFocusProvider } from "@/app/components/auth/AuthFocusContext";

/**
 * The "Interactive Editorial Split": a brand canvas that reacts to form focus
 * on the left, the form on the right.
 *
 * Typed LayoutProps<"/"> because a route group adds no path segment.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthFocusProvider>
      {/* flex-1 is required -- <body> is `min-h-full flex flex-col`, so without
          it the full-height sticky aside collapses. svh/dvh rather than
          h-screen also stops mobile browser chrome clipping the submit button. */}
      <div className="grid w-full flex-1 grid-rows-[clamp(180px,30svh,260px)_1fr] lg:min-h-dvh lg:grid-cols-2 lg:grid-rows-none">
        {/* `isolate` gives mix-blend-overlay a stacking context so the grain
            cannot bleed into the form column. */}
        <aside className="relative isolate overflow-hidden bg-ink lg:sticky lg:top-0 lg:h-dvh">
          <AuthCanvasPane />

          <div className="texture-grain pointer-events-none absolute inset-0 z-10 opacity-[0.16] mix-blend-overlay" />

          {/* z-20: painted above the canvas, so the moving key light can never
              wash the wordmark out. */}
          <div className="relative z-20 flex h-full flex-col justify-between p-6 lg:p-10">
            <Link
              href="/"
              className="font-display text-title text-paper transition-opacity duration-300 hover:opacity-75"
            >
              My Store
            </Link>
            <p className="hidden max-w-[16ch] font-display text-display-sm text-paper lg:block">
              Small things, made well.
            </p>
          </div>
        </aside>

        <main className="flex items-center justify-center bg-paper px-6 py-12 sm:px-10 lg:px-14">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>
    </AuthFocusProvider>
  );
}
