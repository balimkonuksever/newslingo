/**
 * The props Next.js gives an admin page. Next.js generates `PageProps` only
 * for files named `page.tsx`, and the admin's are `page.local.tsx`, so that
 * the static site leaves them out (next.config.ts).
 */
export type AdminPageProps<Params = Record<string, never>> = {
  params: Promise<Params>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
