"use client";

import {
  LazyMotion,
  domAnimation,
  m,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  createContext,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";

/**
 * Lets LaneItem subscribe to this lane's scroll container. A server component
 * cannot create or pass a ref, so the container travels through context while
 * the cards themselves pass through as `children` and never re-render on the
 * client.
 */
export const LaneScrollContext =
  createContext<RefObject<HTMLDivElement | null> | null>(null);

export function Lane({
  label,
  sublabel,
  wordmark,
  children,
}: {
  label: string;
  sublabel?: string;
  /** Oversized decorative type behind the lane. Never a heading, never a link. */
  wordmark?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const reduce = useReducedMotion();
  const { scrollXProgress } = useScroll({ container: ref, axis: "x" });

  // The "far" parallax layer.
  const wordX = useTransform(scrollXProgress, [0, 1], ["4rem", "-14rem"]);
  const railWidth = useTransform(scrollXProgress, (v) => `${8 + v * 92}%`);

  function nudge(direction: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({
      left: direction * el.clientWidth * 0.8,
      // Smoothness is applied per call, never as CSS scroll-behavior, so
      // Playwright's own programmatic scrolls stay instantaneous.
      behavior: reduce ? "auto" : "smooth",
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // Never hijack arrows away from a real form control.
    if ((event.target as HTMLElement).closest("input,textarea,select")) return;

    const el = ref.current;
    if (!el) return;
    const behavior: ScrollBehavior = reduce ? "auto" : "smooth";

    if (event.key === "ArrowRight") {
      event.preventDefault();
      nudge(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      nudge(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      el.scrollTo({ left: 0, behavior });
    } else if (event.key === "End") {
      event.preventDefault();
      el.scrollTo({ left: el.scrollWidth, behavior });
    }
  }

  return (
    <LazyMotion features={domAnimation} strict>
      {/* overflow-x-clip, not hidden: the wordmark is meant to bleed past the
          viewport, but it must be clipped rather than widening the document.
          `clip` also avoids creating a scroll container. */}
      <section className="full-bleed relative isolate overflow-x-clip py-10">
        {wordmark && (
          <m.span
            // Decorative only: never a heading (there must be exactly one h1
            // per page) and never inside a link.
            aria-hidden="true"
            style={
              reduce
                ? undefined
                : ({ "--lane-word-x": wordX } as React.CSSProperties)
            }
            className="lane-wordmark pointer-events-none absolute inset-x-0 top-20 -z-10 block select-none px-[var(--lane-pad,1rem)] font-display text-[clamp(3rem,11vw,9rem)] font-semibold uppercase leading-none tracking-tighter text-ink/[0.09]"
          >
            {wordmark}
          </m.span>
        )}

        <div className="mx-auto flex max-w-5xl items-baseline justify-between gap-6 px-4 pb-5">
          <div className="flex flex-col gap-1">
            {/* Plain h2, not a link: a second link containing the category name
                would make getByRole("link", { name: "Mugs" }) ambiguous. */}
            <h2 id={headingId} className="text-title">
              {label}
            </h2>
            {sublabel && (
              <p className="text-body-sm text-ink-muted">{sublabel}</p>
            )}
          </div>

          <div className="flex shrink-0 gap-1">
            {/* role=button, so the link-role queries in the suite can never
                match these even though the name contains the category. */}
            <button
              type="button"
              onClick={() => nudge(-1)}
              aria-label={`Scroll ${label} left`}
              className="flex size-9 items-center justify-center rounded-full border border-rule text-ink-muted transition-colors hover:border-rule-strong hover:text-ink"
            >
              &#8592;
            </button>
            <button
              type="button"
              onClick={() => nudge(1)}
              aria-label={`Scroll ${label} right`}
              className="flex size-9 items-center justify-center rounded-full border border-rule text-ink-muted transition-colors hover:border-rule-strong hover:text-ink"
            >
              &#8594;
            </button>
          </div>
        </div>

        <LaneScrollContext.Provider value={ref}>
          <div
            ref={ref}
            // Chrome does not make overflow containers focusable (Firefox
            // does), so WCAG 2.1.1 needs this explicitly.
            role="region"
            aria-labelledby={headingId}
            tabIndex={0}
            onKeyDown={onKeyDown}
            className="lane focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
          >
            {children}
          </div>
        </LaneScrollContext.Provider>

        <div
          aria-hidden="true"
          className="mx-auto mt-5 h-px max-w-5xl bg-ink/10"
        >
          <m.div style={{ width: railWidth }} className="h-px bg-ink/50" />
        </div>
      </section>
    </LazyMotion>
  );
}
