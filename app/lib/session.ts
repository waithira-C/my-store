import { headers } from "next/headers";
import { auth } from "./auth";

/**
 * Returns the signed-in user, or null. Every page and server action that needs
 * identity goes through here rather than calling auth.api.getSession directly.
 */
export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });

  return session?.user ?? null;
}
