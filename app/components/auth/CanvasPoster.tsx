import Image from "next/image";

/**
 * The always-rendered ground layer of the auth canvas.
 *
 * This is not a placeholder: below `lg`, under prefers-reduced-motion, and on
 * any device without WebGL, it is the finished visual. The gradients mirror
 * the 3D scene's idle pose (warm key from the upper right, deep falloff at the
 * foot) so the two states read as the same photograph.
 */
export function CanvasPoster() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-ink">
      <Image
        src="/images/sunrise-mug.avif"
        alt=""
        fill
        priority
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover opacity-45 saturate-[0.55] contrast-[1.05]"
      />
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_78%_12%,rgba(255,244,230,0.34),transparent_62%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(20,17,14,0.94),rgba(20,17,14,0.3)_52%,rgba(20,17,14,0.66))]" />
    </div>
  );
}
