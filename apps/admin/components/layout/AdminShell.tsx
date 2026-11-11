"use client";

// apps/admin/components/layout/AdminShell.tsx
//
// The frame around every signed-in admin page: login check, sidebar, page
// title bar, then the page's content. A page only has to do:
//
//   <AdminShell title="Products" subtitle="186 products" actions={<Button…/>}>
//     …page content…
//   </AdminShell>

import { useCallback, useState, type ReactNode } from "react";
import RequireAuth from "./RequireAuth";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

interface AdminShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function AdminShell({ title, subtitle, actions, children }: AdminShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  return (
    <RequireAuth>
      <div className="flex min-h-screen bg-offwhite font-sans text-navy">
        <Sidebar open={menuOpen} onClose={closeMenu} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar title={title} subtitle={subtitle} actions={actions} onOpenMenu={() => setMenuOpen(true)} />
          <main className="flex flex-col gap-5 px-4 pb-10 pt-5 sm:px-8">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}
