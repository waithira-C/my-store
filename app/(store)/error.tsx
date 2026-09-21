"use client";

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-ink-muted">
        {error.digest ? `Reference: ${error.digest}` : "Please try again."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="cursor-pointer rounded-field bg-ink px-4 py-2 text-ink-inverse"
      >
        Try again
      </button>
    </div>
  );
}
