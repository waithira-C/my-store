import { z } from "zod";

const email = z.email("Enter a valid email address.");

export const signInSchema = z.object({
  email,
  // Deliberately only checks presence: enforcing a length rule on sign-in
  // leaks the password policy and would lock out any account whose password
  // predates the current rule. better-auth rejects wrong credentials anyway.
  password: z.string().min(1, "Password is required."),
});

export const signUpSchema = z.object({
  email,
  // Mirrors better-auth's default 8-character minimum so the user gets a
  // field-level message instead of an APIError after a round trip.
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be at most 128 characters."),
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(80, "Name must be at most 80 characters."),
});

export type FieldErrors = Record<string, string[] | undefined>;

type ParseResult<T> =
  { success: true; data: T } | { success: false; fieldErrors: FieldErrors };

/**
 * Validates raw FormData against a schema. Never trusts `formData.get()` to be
 * a string -- a missing field yields `null`, which zod rejects.
 */
export function parseFormData<T extends z.ZodType>(
  schema: T,
  formData: FormData,
): ParseResult<z.infer<T>> {
  const result = schema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return { success: false, fieldErrors: result.error.flatten().fieldErrors };
  }

  return { success: true, data: result.data };
}

/* ---------------------------------- cart ---------------------------------- */

// FormData values are always strings, hence the coercion.
const quantity = z.coerce
  .number()
  .int("Quantity must be a whole number.")
  .min(1, "Quantity must be at least 1.")
  .max(99, "Quantity must be at most 99.");

export const addToCartSchema = z.object({
  productId: z.string().min(1),
  quantity: quantity.default(1),
});

export const updateQuantitySchema = z.object({
  itemId: z.string().min(1),
  quantity,
});

export const removeItemSchema = z.object({
  itemId: z.string().min(1),
});

/* -------------------------------- checkout -------------------------------- */

export const checkoutSchema = z.object({
  email,
  line1: z.string().trim().min(1, "Address is required."),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1, "City is required."),
  postalCode: z.string().trim().min(1, "Postal code is required."),
  country: z
    .string()
    .trim()
    .length(2, "Use a two-letter country code, e.g. US.")
    .transform((value) => value.toUpperCase()),
});
