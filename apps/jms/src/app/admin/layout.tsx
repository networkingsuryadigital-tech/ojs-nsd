import { requirePlatformSuperAdmin } from "@/application/identity/require-platform-super-admin";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePlatformSuperAdmin();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <p className="text-sm font-semibold">Platform admin — JMS</p>
        <nav className="mt-1 flex gap-4 text-sm">
          <Link href="/admin/journals" className="hover:underline">
            Jurnal
          </Link>
          <Link href="/" className="hover:underline">
            Situs jurnal
          </Link>
        </nav>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
