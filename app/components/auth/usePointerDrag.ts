"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

export type DragState = {
  /** Accumulated horizontal rotation, radians, clamped. */
  yaw: number;
  /** Accumulated vertical rotation, radians, clamped. */
  pitch: number;
  dragging: boolean;
  /** performance.now() of the last pointerup, for the spring-back delay. */
  releasedAt: number;
  /** Pointer position in -1..1, for hover parallax before a drag starts. */
  hoverX: number;
  hoverY: number;
};

const YAW_LIMIT = 0.55;
/** Wait a beat after release before drifting home, so it never snaps. */
const SPRING_BACK_DELAY_MS = 1200;
const SPRING_BACK_LAMBDA = 0.8;
const PITCH_LIMIT = 0.22;

const clamp = (value: number, limit: number) =>
  Math.min(limit, Math.max(-limit, value));

/**
 * Cursor-drag rotation for the auth canvas.
 *
 * Everything is written into a mutable ref rather than React state: this
 * updates on every pointermove, and a re-render per frame would be wasteful
 * and would fight the useFrame loop that reads it.
 *
 * Deliberately hand-rolled instead of drei's OrbitControls, which binds its own
 * keyboard handlers to the canvas -- the canvas must never be focusable or
 * trap keys, since it is aria-hidden decoration.
 */
export type PointerDrag = {
  state: RefObject<DragState>;
  /**
   * Eases the arrangement back to its composed pose a beat after release.
   * Lives in the hook rather than in the useFrame caller so the mutable state
   * is only ever written where it is constructed.
   */
  settle: (delta: number, damp: Damp) => void;
};

/** THREE.MathUtils.damp, injected so this hook stays free of a three import. */
type Damp = (
  current: number,
  target: number,
  lambda: number,
  delta: number,
) => number;

export function usePointerDrag(element: HTMLElement | null): PointerDrag {
  const state = useRef<DragState>({
    yaw: 0,
    pitch: 0,
    dragging: false,
    releasedAt: 0,
    hoverX: 0,
    hoverY: 0,
  });

  useEffect(() => {
    if (!element) return;

    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (event: PointerEvent) => {
      state.current.dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      element.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      state.current.hoverX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      state.current.hoverY = ((event.clientY - rect.top) / rect.height) * 2 - 1;

      if (!state.current.dragging) return;

      state.current.yaw = clamp(
        state.current.yaw + (event.clientX - lastX) * 0.004,
        YAW_LIMIT,
      );
      state.current.pitch = clamp(
        state.current.pitch + (event.clientY - lastY) * 0.003,
        PITCH_LIMIT,
      );

      lastX = event.clientX;
      lastY = event.clientY;
    };

    const endDrag = (event: PointerEvent) => {
      if (!state.current.dragging) return;
      state.current.dragging = false;
      state.current.releasedAt = performance.now();
      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
    };

    const onPointerLeave = () => {
      state.current.hoverX = 0;
      state.current.hoverY = 0;
    };

    element.addEventListener("pointerdown", onPointerDown);
    element.addEventListener("pointermove", onPointerMove);
    element.addEventListener("pointerup", endDrag);
    element.addEventListener("pointercancel", endDrag);
    element.addEventListener("pointerleave", onPointerLeave);

    return () => {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", endDrag);
      element.removeEventListener("pointercancel", endDrag);
      element.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [element]);

  const settle = useCallback((delta: number, damp: Damp) => {
    const drag = state.current;
    if (drag.dragging) return;
    if (performance.now() - drag.releasedAt <= SPRING_BACK_DELAY_MS) return;

    drag.yaw = damp(drag.yaw, 0, SPRING_BACK_LAMBDA, delta);
    drag.pitch = damp(drag.pitch, 0, SPRING_BACK_LAMBDA, delta);
  }, []);

  return { state, settle };
}
