"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";
import type { AuthField } from "./AuthFocusContext";
import { StillLife } from "./StillLife";

/**
 * The WebGL layer of the auth canvas.
 *
 * Default export because AuthCanvasPane reaches it through
 * `dynamic(() => import("./AuthScene"), { ssr: false })`. That import is the
 * only one in the codebase -- adding a static import anywhere would merge
 * three.js into the shared client chunk.
 *
 * `activeField` arrives as a prop rather than through context on purpose:
 * <Canvas> creates a separate React reconciler root, and context forwarding
 * across that boundary has been fragile across r3f versions.
 */
export default function AuthScene({ activeField }: { activeField: AuthField }) {
  return (
    <Canvas
      className="absolute inset-0"
      // Never focusable: the whole pane is aria-hidden decoration and must not
      // appear in the tab order or trap keys.
      tabIndex={-1}
      dpr={[1, 1.75]}
      shadows
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0.55, 5.2], fov: 38 }}
      style={{ touchAction: "none" }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        scene.fog = new THREE.FogExp2("#14110e", 0.055);
      }}
    >
      {/* The print texture suspends while it loads; the poster underneath is
          already on screen, so null is the right fallback. */}
      <Suspense fallback={null}>
        <StillLife activeField={activeField} />
      </Suspense>
    </Canvas>
  );
}
