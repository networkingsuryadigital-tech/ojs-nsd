import { requirePlatformSuperAdmin } from "@/application/identity/require-platform-super-admin";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { WorkspaceAccountMenu } from "@/components/workspace/workspace-account-menu";
import { resolveSessionUser } from "@/application/identity/resolve-session-user";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePlatformSuperAdmin();
  const sessionUser = await resolveSessionUser();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground md:flex-row">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-1 border-b border-border bg-background/85 px-4 backdrop-blur-md">
          <ThemeToggle />
          {sessionUser ? (
            <WorkspaceAccountMenu
              email={sessionUser.email}
              name={sessionUser.name}
              signOutLabel="Keluar"
            />
          ) : null}
        </header>
        <div className="mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 py-8 md:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
