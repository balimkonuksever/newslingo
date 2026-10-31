import type { Metadata } from "next";

// Admin pages stay out of search results. Each page checks access itself
// (ADR-003): a layout does not re-render on navigation, so it is no guard.
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Newslingo admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
