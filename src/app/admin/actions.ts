"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "@/server/auth";
import { ADMIN_PATHS } from "@/server/auth/session";
import {
  getSignInLimits,
  signInWithPassword,
  signOutAdmin,
  verifySignInCode,
} from "@/server/auth/sign-in";

/** What a sign-in form shows after a refused attempt. */
export type SignInFormState = {
  message?: string;
  /** The email address to fill in again. */
  email?: string;
};

export async function submitPassword(
  _previous: SignInFormState,
  formData: FormData,
): Promise<SignInFormState> {
  const email = formData.get("email");
  const result = await signInWithPassword(
    getAuth(),
    getSignInLimits(),
    await headers(),
    { email, password: formData.get("password") },
  );

  if (result.status === "code-needed") {
    redirect(ADMIN_PATHS.code);
  }

  return {
    message: result.message,
    email: typeof email === "string" ? email : undefined,
  };
}

export async function submitCode(
  _previous: SignInFormState,
  formData: FormData,
): Promise<SignInFormState> {
  const result = await verifySignInCode(
    getAuth(),
    getSignInLimits(),
    await headers(),
    { code: formData.get("code") },
  );

  if (result.status === "signed-in") {
    redirect(ADMIN_PATHS.home);
  }

  if (result.status === "expired") {
    redirect(`${ADMIN_PATHS.signIn}?expired`);
  }

  return { message: result.message };
}

export async function signOut() {
  await signOutAdmin(getAuth(), await headers());

  redirect(ADMIN_PATHS.signIn);
}
