"use client";

import {
  LazyMotion,
  domAnimation,
  m,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useContext, useRef, type ReactNode } from "react";
import { LaneScrollContext } from "./Lane";

/**
 * The client motion shell around a server-rendered <ProductCard>.
 *
 * It never touches the card. It publishes CSS custom properties on itself and
 * the card's own classes (.lane-media-inner, .lane-spec) consume them, which
 * is what lets ProductCard stay a server component while still being
 * parallaxed. framer-motion writes motion values into custom properties
 * outside React, so there is no re-render per scroll frame.
 */
export function LaneItem({
  depth = 1,
  spec,
  children,
}: {
  /** Higher values move further, creating the depth stack. */
  depth?: number;
  spec?: string;
  children: ReactNode;
}) {
  const container = useContext(LaneScrollContext);
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const { scrollXProgress } = useScroll({
    container: container ?? undefined,
    target: ref,
    axis: "x",
    // 0 as the card enters from the right, 1 as it exits left.
    offset: ["start end", "end start"],
  });

  const mediaX = useTransform(
    scrollXProgress,
    [0, 1],
    [`${18 * depth}px`, `${-18 * depth}px`],
  );
  const specX = useTransform(
    scrollXProgress,
    [0, 1],
    [`${34 * depth}px`, `${-34 * depth}px`],
  );

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        ref={ref}
        style={
          reduce
            ? undefined
            : ({
                "--lane-media-x": mediaX,
                "--lane-spec-x": specX,
              } as React.CSSProperties)
        }
        className="flex flex-col gap-3"
      >
        {children}
        {spec && (
          /* OUTSIDE the card's <Link>, deliberately: this string contains the
             category name, and inside the link it would become a second
             "Mugs" match on /products. */
          <p className="lane-spec font-mono text-meta uppercase text-ink-faint">
            {spec}
          </p>
        )}
      </m.div>
    </LazyMotion>
  );
}
