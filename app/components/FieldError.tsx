import type { FieldErrors } from "@/app/lib/validation";

/**
 * Renders the first validation message for a field, if there is one.
 * Shared by the auth forms and, later, the checkout form.
 */
export function FieldError({
  errors,
  name,
}: {
  errors: FieldErrors | undefined;
  name: string;
}) {
  const message = errors?.[name]?.[0];

  if (!message) return null;

  return (
    <p className="text-danger text-sm" role="alert">
      {message}
    </p>
  );
}
