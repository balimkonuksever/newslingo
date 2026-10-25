import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getAuth } from "@/server/auth";
import { type AdminIdentity, getAdminAccess } from "@/server/auth/access";

export const ADMIN_PATHS = {
  home: "/admin",
  signIn: "/admin/sign-in",
  code: "/admin/sign-in/code",
} as const;

/** The request's admin access, worked out once per request. */
const currentAccess = cache(async () =>
  getAdminAccess(getAuth(), await headers()),
);

/**
 * The signed-in admin. Every admin page, server action and route handler
 * starts with this (ADR-003); anyone else goes to the sign-in page.
 */
export async function requireAdmin(): Promise<AdminIdentity> {
  const access = await currentAccess();

  if (access.status !== "admin") {
    redirect(
      access.status === "signed-out"
        ? ADMIN_PATHS.signIn
        : `${ADMIN_PATHS.signIn}?denied`,
    );
  }

  return access.admin;
}

/** The signed-in admin, or `null`, for pages anyone may open. */
export async function getSignedInAdmin(): Promise<AdminIdentity | null> {
  const access = await currentAccess();

  return access.status === "admin" ? access.admin : null;
}
