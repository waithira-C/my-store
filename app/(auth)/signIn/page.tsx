"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useActionState, useId } from "react";
import { type AuthState, signInAction } from "@/app/actions/auth";
import { useAuthFormFocus } from "@/app/components/auth/AuthFocusContext";
import { FieldError } from "@/app/components/FieldError";

const fieldClass =
  "w-full rounded-field border border-field bg-paper-raised px-3 py-2.5 text-body text-ink " +
  "placeholder:text-ink-faint transition-colors duration-200 ease-editorial " +
  "hover:border-rule-strong focus:border-clay focus:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-clay/35";

export default function SignInPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signInAction,
    { error: null },
  );
  const formFocus = useAuthFormFocus();
  const emailId = useId();
  const passwordId = useId();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      className="flex flex-col gap-8"
    >
      <header className="flex flex-col gap-2">
        <p className="text-meta uppercase text-ink-faint">Welcome back</p>
        <h1 className="font-display text-display-sm text-ink">Sign In</h1>
      </header>

      {/* Focus wiring lives on the form, not per-input: relatedTarget lets us
          tell "moved to the next field" from "left the form", so tabbing
          between fields never dips the canvas back to its idle pose. */}
      <form action={formAction} {...formFocus} className="flex flex-col gap-5">
        <AnimatePresence initial={false}>
          {state?.error && (
            <motion.p
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
              className="overflow-hidden rounded-field border border-danger/30 bg-danger-soft px-3 py-2 text-body-sm text-danger"
            >
              {state.error}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={emailId}
            className="text-meta uppercase text-ink-muted"
          >
            Email
          </label>
          <input
            id={emailId}
            type="email"
            name="email"
            /* CONTRACT: e2e uses getByPlaceholder("Email"). Do not remove. */
            placeholder="Email"
            autoComplete="email"
            required
            className={fieldClass}
          />
          <FieldError errors={state?.fieldErrors} name="email" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={passwordId}
            className="text-meta uppercase text-ink-muted"
          >
            Password
          </label>
          <input
            id={passwordId}
            type="password"
            name="password"
            /* CONTRACT: e2e uses getByPlaceholder("Password"). Do not remove. */
            placeholder="Password"
            autoComplete="current-password"
            required
            className={fieldClass}
          />
          <FieldError errors={state?.fieldErrors} name="password" />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-1 inline-flex items-center justify-center rounded-field bg-ink px-4 py-2.5 text-body-sm font-medium text-ink-inverse transition-colors duration-200 ease-editorial hover:bg-clay-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {/* CONTRACT: plain text node only. Never wrap this in AnimatePresence
              -- a crossfade renders both labels for a frame and the accessible
              name momentarily becomes "Sign InSigning in...". */}
          {pending ? "Signing in…" : "Sign In"}
        </button>

        <p className="text-body-sm text-ink-muted">
          Don&apos;t have an account?{" "}
          <Link
            href="/signUp"
            className="text-clay underline underline-offset-4 hover:text-clay-strong"
          >
            Create one
          </Link>
        </p>
      </form>
    </motion.div>
  );
}
