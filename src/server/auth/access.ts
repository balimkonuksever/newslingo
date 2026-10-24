import "server-only";

import { ADMIN_ROLE, type Auth } from "@/server/auth/config";

/** What admin pages may know about the signed-in admin. */
export type AdminIdentity = {
  id: string;
  name: string;
  email: string;
};

export type AdminAccess =
  | { status: "signed-out" }
  | { status: "not-admin" }
  | { status: "no-authenticator" }
  | { status: "admin"; admin: AdminIdentity };

/**
 * Decides whether a request comes from an admin (ADR-003). Every admin page,
 * server action and route handler asks this itself: a layout or `proxy.ts`
 * is never the only check.
 *
 * An admin also needs an authenticator app. The admin command sets one up
 * before it finishes, so an admin without one is a half-finished account and
 * opens nothing.
 */
export async function getAdminAccess(
  auth: Auth,
  headers: Headers,
): Promise<AdminAccess> {
  const session = await auth.api.getSession({ headers });

  if (!session) {
    return { status: "signed-out" };
  }

  const { user } = session;

  if (user.role !== ADMIN_ROLE) {
    return { status: "not-admin" };
  }

  if (user.twoFactorEnabled !== true) {
    return { status: "no-authenticator" };
  }

  return {
    status: "admin",
    admin: { id: user.id, name: user.name, email: user.email },
  };
}
