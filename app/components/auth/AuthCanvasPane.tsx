"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { hasWebGL } from "@/app/lib/hasWebGL";
import { useMediaQuery } from "@/app/lib/useMediaQuery";
import { useAuthFocus } from "./AuthFocusContext";
import { CanvasPoster } from "./CanvasPoster";
import { SceneErrorBoundary } from "./SceneErrorBoundary";

/**
 * MODULE SCOPE, on purpose. Calling dynamic() during render mints a new
 * component type every pass, which tears down and rebuilds the WebGL context.
 *
 * `ssr: false` requires a Client Component in Next 16 -- see
 * node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md. This file is
 * the boundary, and it must stay the ONLY import of AuthScene: one stray
 * static import merges three.js into the shared client chunk and every gate
 * below becomes decoration.
 */
const AuthScene = dynamic(() => import("./AuthScene"), {
  ssr: false,
  loading: () => null, // the poster underneath is already the placeholder
});

export function AuthCanvasPane() {
  const { activeField } = useAuthFocus();
  const isWide = useMediaQuery("(min-width: 64rem)");
  const prefersReduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [deferred, setDeferred] = useState(false);

  // Never compete with hydration or with the form becoming interactive.
  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setDeferred(true), {
        timeout: 1500,
      });
      return () => window.cancelIdleCallback(id);
    }
    // Safari < 16.4 has no requestIdleCallback.
    const id = window.setTimeout(() => setDeferred(true), 600);
    return () => window.clearTimeout(id);
  }, []);

  const render3d = isWide && !prefersReduced && deferred && hasWebGL();

  return (
    // Decorative. aria-hidden covers the poster AND the canvas, but lives here
    // rather than on the <aside> so the wordmark and tagline beside it stay in
    // the accessibility tree.
    <div aria-hidden="true" className="absolute inset-0">
      <CanvasPoster />
      {render3d && (
        <SceneErrorBoundary>
          <AuthScene activeField={activeField} />
        </SceneErrorBoundary>
      )}
    </div>
  );
}
