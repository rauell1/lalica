import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Admin | Lalica Engineering Limited" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-surface text-ink-900">{children}</div>
  );
}
