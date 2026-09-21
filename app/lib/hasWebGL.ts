let cached: boolean | null = null;

/**
 * One-shot, memoised WebGL probe. Guards the 3D auth canvas so browsers or
 * headless environments without a GL context fall back to the static poster
 * instead of mounting a renderer that will throw.
 */
export function hasWebGL(): boolean {
  if (cached !== null) return cached;
  if (typeof window === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    cached = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    cached = false;
  }

  return cached;
}
