"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * A lost WebGL context or a failed texture load must never blank the auth
 * route. Rendering `null` on error leaves the static poster underneath as the
 * final state, which is a complete design on its own.
 */
export class SceneErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("Auth canvas failed, falling back to poster.", error, info);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
