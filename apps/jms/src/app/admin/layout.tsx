import { requirePlatformSuperAdmin } from "@/application/identity/require-platform-super-admin";

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
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
