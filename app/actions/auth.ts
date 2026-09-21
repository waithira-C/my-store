"use server";

import { headers } from "next/headers";
import { auth } from "../lib/auth";
import { redirect } from "next/navigation";
import { APIError } from "better-auth";
import { mergeGuestCartIntoUserCart } from "../lib/cart";
import {
  type FieldErrors,
  parseFormData,
  signInSchema,
  signUpSchema,
} from "../lib/validation";

export type AuthState = { error: string | null; fieldErrors?: FieldErrors };

export async function signUpAction(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = parseFormData(signUpSchema, formData);

  if (!parsed.success) {
    return { error: null, fieldErrors: parsed.fieldErrors };
  }

  const { email, password, name } = parsed.data;

  try {
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    // Carry over anything added to the cart before registering.
    await mergeGuestCartIntoUserCart(result.user.id);
  } catch (error) {
    if (error instanceof APIError) {
      return { error: error.message };
    }
    return { error: "Something went wrong. Please try again." };
  }

  redirect("/");
}

export async function signInAction(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = parseFormData(signInSchema, formData);

  if (!parsed.success) {
    return { error: null, fieldErrors: parsed.fieldErrors };
  }

  const { email, password } = parsed.data;

  try {
    const result = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
    });

    // Carry over anything added to the cart before signing in.
    await mergeGuestCartIntoUserCart(result.user.id);
  } catch (error) {
    if (error instanceof APIError) {
      return { error: error.message };
    }
    return { error: "Something went wrong. Please try again." };
  }

  redirect("/");
}

export async function signOutAction() {
  await auth.api.signOut({
    headers: await headers(),
  });

  redirect("/signIn");
}
