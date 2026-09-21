"use client";

import { useActionState } from "react";
import {
  createCheckoutSessionAction,
  type CheckoutState,
} from "@/app/actions/checkout";
import { FieldError } from "./FieldError";

const FIELDS = [
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  {
    name: "line1",
    label: "Address",
    type: "text",
    autoComplete: "address-line1",
  },
  {
    name: "line2",
    label: "Address line 2 (optional)",
    type: "text",
    autoComplete: "address-line2",
    optional: true,
  },
  {
    name: "city",
    label: "City",
    type: "text",
    autoComplete: "address-level2",
  },
  {
    name: "postalCode",
    label: "Postal code",
    type: "text",
    autoComplete: "postal-code",
  },
  {
    name: "country",
    label: "Country code",
    type: "text",
    autoComplete: "country",
    placeholder: "US",
  },
] as const;

export function CheckoutForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(
    createCheckoutSessionAction,
    { error: null },
  );

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      {state.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      {FIELDS.map((field) => (
        <div key={field.name} className="flex flex-col gap-1">
          <label htmlFor={field.name} className="text-sm font-medium">
            {field.label}
          </label>
          <input
            id={field.name}
            name={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            placeholder={"placeholder" in field ? field.placeholder : undefined}
            required={!("optional" in field && field.optional)}
            defaultValue={field.name === "email" ? defaultEmail : undefined}
            className="rounded-field border border-field p-2"
          />
          <FieldError errors={state.fieldErrors} name={field.name} />
        </div>
      ))}

      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-field bg-ink px-5 py-2.5 text-ink-inverse hover:bg-clay-strong disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Redirecting to payment…" : "Pay with card"}
      </button>
    </form>
  );
}
