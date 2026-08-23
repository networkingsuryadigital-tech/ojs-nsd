import { requirePlatformSuperAdmin } from "@/application/identity/require-platform-super-admin";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SignOutButton } from "@/components/tenant/sign-out-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePlatformSuperAdmin();
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground md:flex-row">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-end gap-4 border-b border-foreground/10 px-4 py-2 text-sm">
          <ThemeToggle />
          <SignOutButton label="Keluar" />
        </div>
        <div className="mx-auto w-full max-w-5xl min-w-0 flex-1 px-4 py-8 md:px-6">
          {children}
        </div>
      </div>
    </div>
  );
}
