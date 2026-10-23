# ADR-003: Admin authentication with Better Auth

- Status: Accepted
- Date: 2026-10-14
- Owners: Newslingo engineering

## Context

M5 adds the admin pages that move articles through the moderation lifecycle, and the plan's open decision asked for simple, secure admin-only authentication with no general user model before M5 starts. Today there is one admin, the project owner. Hosting is not chosen yet, so the solution must not depend on a host.

The authentication guide for this Next.js version (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`) recommends an authentication library over a hand-written one, and authorization checks close to the data, in a server-only data access layer, rather than in layouts or in `proxy.ts` alone.

The options were:

1. Better Auth with GitHub sign-in, limited to the owner's GitHub account.
2. Better Auth with an email, a password and a code from an authenticator app.
3. A hosted service such as Clerk.
4. Auth.js (NextAuth). Its maintainers joined Better Auth in September 2025 and recommend Better Auth for new projects; Auth.js now gets security fixes only.
5. A hand-written password login with signed session cookies.

## Decision

Use option 2, chosen by the user on 2026-10-14:

- Better Auth runs inside the Next.js app. Its Prisma adapter keeps sessions in PostgreSQL, so a session can be revoked.
- Admins sign in with an email and a password. Public sign-up is disabled: an admin account is created by a guarded command, never through a page.
- Every admin also enters a code from an authenticator app (TOTP), with backup codes, through Better Auth's two-factor plugin.
- An `admin` role is checked in a server-only data access layer that every admin page, server action and route handler calls. `proxy.ts` may redirect signed-out visitors early, but it is never the only check.
- Sign-in and sensitive admin actions are rate limited.
- Tests sign in with a fixture admin account in the test database. No test uses a real account.

## Consequences

- No third-party account or data processor is involved, and the app stays portable across hosts.
- M5 adds Better Auth's tables in a new migration. They hold admins only; readers still have no accounts.
- The owner keeps a password and an authenticator app safe. M5 must provide a recovery path that needs database access, such as resetting an admin's password and second factor with the same guarded command.
- Better Auth 1.7.7 (released 2026-09-30) is the current version and declares support for Next.js 16, React 19 and Prisma 7. The first M5 slice pins an exact version and confirms that the adapter works with this project's Prisma 7.10.0 `prisma-client` generator and driver adapter before anything is built on it. If it does not, this decision is revisited before M5 continues.

## References

- `IMPLEMENTATION_PLAN.md` M0, M5, §15 (security plan) and §19 (decision log)
- Better Auth with Next.js: <https://better-auth.com/docs/integrations/next>
- Auth.js joins Better Auth: <https://www.better-auth.com/blog/authjs-joins-better-auth>
