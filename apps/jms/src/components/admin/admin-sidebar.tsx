"use client";

import { Home, LayoutDashboard, Library } from "lucide-react";

import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";

export function AdminSidebar() {
  return (
    <WorkspaceSidebar
      sidebarId="platform-admin-sidebar"
      journalName="JMS Platform"
      roleLabel="Platform"
      navLabel="Navigasi platform"
      openMenuLabel="Buka menu platform"
      closeMenuLabel="Tutup menu platform"
      items={[
        {
          href: "/admin/journals",
          label: "Jurnal",
          icon: Library,
          isActive: (pathname) => pathname.startsWith("/admin"),
        },
        {
          href: "/editorial/dashboard",
          label: "Dashboard jurnal",
          icon: LayoutDashboard,
          isActive: () => false,
        },
        {
          href: "/",
          label: "Situs jurnal",
          icon: Home,
          isActive: () => false,
        },
      ]}
    />
  );
}
