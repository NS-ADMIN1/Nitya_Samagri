"use client";

// apps/admin/components/layout/Sidebar.tsx
//
// The navy menu on the left. Staff only see the items their role can use
// (see lib/nav.ts). On phones it is hidden and opens as a drawer from the
// menu button in the Topbar.

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAdminSession, getAdminSession, type AdminUser } from "../../lib/adminAuth";
import { isActive, navForRole, roleLabel } from "../../lib/nav";
import { BRAND } from "../../lib/theme";
import Avatar from "../ui/Avatar";
import Icon from "../ui/Icon";

interface SidebarProps {
  /** Phone drawer state; ignored on desktop where the menu is always visible. */
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // The session lives in localStorage, so it is only known after mount.
  const [user, setUser] = useState<AdminUser | undefined>(undefined);
  useEffect(() => {
    setUser(getAdminSession()?.user);
  }, []);

  // Close the phone drawer after moving to another page.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const signOut = () => {
    clearAdminSession();
    router.push("/login");
  };

  const groups = navForRole(user?.role);

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-navy/50 lg:hidden"
        />
      )}

      <nav
        aria-label="Main"
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] shrink-0 flex-col gap-1.5 overflow-y-auto bg-navy px-3.5 py-5 font-sans text-white transition-transform lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-2 pb-4 pt-1">
          <span className="flex rounded-[10px] bg-white px-2 py-1.5">
            <Image src={BRAND.logoMark} alt={BRAND.name} width={249} height={157} className="h-[26px] w-auto" priority />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[15px] font-bold tracking-[0.02em] text-white">{BRAND.name}</span>
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-gold">{BRAND.panel}</span>
          </span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-[10px] text-[#D5DBE8] hover:bg-white/10 lg:hidden"
          >
            <Icon name="close" />
          </button>
        </div>

        {groups.map((group, i) => (
          <div key={group.label || `group-${i}`} className="flex flex-col gap-1">
            {group.label && (
              <div className="px-2.5 pb-1 pt-3.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#A9B4CB]">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const base = "flex min-h-[44px] items-center gap-3 rounded-[10px] px-3 text-sm";
              if (item.ready === false) {
                return (
                  <span key={item.id} aria-disabled className={`${base} font-medium text-[#8F9BB5]`}>
                    <Icon name={item.icon} size={19} />
                    {item.label}
                    <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.06em]">Soon</span>
                  </span>
                );
              }
              const on = isActive(item, pathname);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={on ? "page" : undefined}
                  className={`${base} ${
                    on ? "bg-white/[0.12] font-semibold text-white" : "font-medium text-[#D5DBE8] hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <Icon name={item.icon} size={19} className={on ? "text-gold" : "text-[#A9B4CB]"} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}

        <div className="mt-auto pt-4">
          <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.07] p-2.5">
            <Avatar name={user?.name} onDark />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[13px] font-semibold text-white">{user?.name || "Staff"}</span>
              <span className="truncate text-xs text-[#A9B4CB]">{roleLabel(user?.role)}</span>
            </span>
            <button
              type="button"
              aria-label="Sign out"
              onClick={signOut}
              className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-[#D5DBE8] hover:bg-white/10 hover:text-white"
            >
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
