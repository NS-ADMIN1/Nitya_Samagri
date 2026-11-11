// apps/admin/lib/nav.ts
//
// The sidebar menu, and which staff roles see which items.
//
// The login response only carries the user's base role (not their
// individual permission list), so the menu is filtered with the same
// role → permission defaults the backend uses in
// backend/src/config/permissions.ts (DEFAULT_PERMISSIONS_BY_ROLE). This only
// decides what is *shown*; the API still enforces real access on every call.

import type { IconName } from "../components/ui/Icon";

export type Permission =
  | "products.manage"
  | "inventory.manage"
  | "coupons.manage"
  | "store.manage"
  | "orders.view"
  | "orders.manage"
  | "users.view"
  | "users.manage"
  | "pandits.manage"
  | "reports.view"
  | "team.manage"
  | "settings.manage";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: IconName;
  /** Permission needed to see the item. Omit for items every staff member sees. */
  permission?: Permission;
  /** false while the page is still being built — shown greyed out, not clickable. */
  ready?: boolean;
}

export interface NavGroup {
  /** Omit for the top, unlabelled group. */
  label?: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    items: [
      { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard" },
      { id: "orders", label: "Orders", href: "/orders", icon: "orders", permission: "orders.view" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { id: "products", label: "Products", href: "/products", icon: "products", permission: "products.manage" },
      { id: "inventory", label: "Inventory", href: "/inventory", icon: "inventory", permission: "inventory.manage" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { id: "coupons", label: "Coupons", href: "/coupons", icon: "coupons", permission: "coupons.manage" },
      { id: "store", label: "Storefront", href: "/store", icon: "store", permission: "store.manage" },
    ],
  },
  {
    label: "Insights",
    items: [
      { id: "customers", label: "Customers", href: "/customers", icon: "customers", permission: "users.view" },
      { id: "reports", label: "Reports", href: "/reports", icon: "reports", permission: "reports.view" },
    ],
  },
  {
    label: "Admin",
    items: [
      { id: "team", label: "Team & roles", href: "/team", icon: "team", permission: "team.manage" },
      { id: "settings", label: "Settings", href: "/settings", icon: "settings", permission: "settings.manage", ready: false },
    ],
  },
];

// Mirror of DEFAULT_PERMISSIONS_BY_ROLE in backend/src/config/permissions.ts.
// super_admin is handled separately (sees everything).
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: ["products.manage", "inventory.manage", "coupons.manage", "store.manage", "orders.manage", "orders.view", "users.view", "reports.view"],
  order_manager: ["orders.manage", "orders.view", "users.view"],
  warehouse: ["inventory.manage", "orders.view"],
  support: ["orders.view", "users.view"],
  pandit: ["pandits.manage"],
};

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  order_manager: "Order Manager",
  warehouse: "Warehouse",
  support: "Support",
  pandit: "Pandit",
};

export function roleLabel(role?: string): string {
  if (!role) return "Staff";
  return ROLE_LABELS[role] || role;
}

export function canSee(item: NavItem, role?: string): boolean {
  if (!item.permission) return true;
  if (role === "super_admin") return true;
  if (!role) return false;
  return (ROLE_PERMISSIONS[role] || []).includes(item.permission);
}

/** The menu for one role: groups with no visible items are dropped. */
export function navForRole(role?: string): NavGroup[] {
  return NAV.map((group) => ({ ...group, items: group.items.filter((item) => canSee(item, role)) })).filter(
    (group) => group.items.length > 0,
  );
}

/** True when `pathname` is the item's page or a page under it (/products/new → Products). */
export function isActive(item: NavItem, pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
