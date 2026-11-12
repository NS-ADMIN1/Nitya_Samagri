// src/config/permissions.ts
//
// Fine-grained permission catalog for the admin "Team & Roles" system.
// This sits alongside (not instead of) the existing coarse-grained
// User.role enum + requireRole() checks used across the rest of the API —
// those are untouched. Permissions are an additive layer: super_admin
// always has every permission implicitly; everyone else needs it listed
// on their User.permissions array (directly, or via a Role template whose
// permissions were copied onto them at assignment time).

export interface PermissionDef {
  key: string;
  label: string;
  group: string;
}

export const PERMISSIONS: PermissionDef[] = [
  { key: "products.manage", label: "Create, edit, hide & archive products", group: "Catalog" },
  { key: "inventory.manage", label: "Adjust stock levels & view inventory logs", group: "Catalog" },
  { key: "coupons.manage", label: "Create, edit & schedule coupons", group: "Marketing" },
  { key: "store.manage", label: "Banners, festival campaigns, blog & SEO", group: "Marketing" },
  { key: "orders.view", label: "View orders", group: "Orders" },
  { key: "orders.manage", label: "Update order status, refunds & shipping", group: "Orders" },
  { key: "users.view", label: "View customer accounts", group: "Customers" },
  { key: "users.manage", label: "Block/unblock customers, edit loyalty", group: "Customers" },
  { key: "pandits.manage", label: "Manage pandit bookings & availability", group: "Bookings" },
  { key: "reports.view", label: "View analytics & reports", group: "Insights" },
  { key: "team.manage", label: "Add/edit team members & create roles", group: "Admin" },
  { key: "settings.manage", label: "Change store-wide settings", group: "Admin" },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

// Sensible starting-point permissions per base system role — used to
// pre-fill the "Add Member" form; super_admin can still tick/untick
// anything before saving, and these are not enforced as a ceiling.
export const DEFAULT_PERMISSIONS_BY_ROLE: Record<string, string[]> = {
  admin: ["products.manage", "inventory.manage", "coupons.manage", "store.manage", "orders.manage", "orders.view", "users.view", "reports.view"],
  order_manager: ["orders.manage", "orders.view", "users.view"],
  warehouse: ["inventory.manage", "orders.view"],
  support: ["orders.view", "users.view"],
  pandit: ["pandits.manage"],
  super_admin: PERMISSION_KEYS,
};

export function isValidPermission(key: string): boolean {
  return PERMISSION_KEYS.includes(key);
}
/**
 * The permissions a staff member actually has. super_admin has everything.
 * A member with no saved list (an account made before Team & Roles, or the
 * seeded admin) gets the defaults for their role.
 */
export function effectivePermissions(user: { role: string; permissions?: string[] | null }): string[] {
  if (user.role === "super_admin") return PERMISSION_KEYS;
  if (user.permissions && user.permissions.length > 0) return user.permissions;
  return DEFAULT_PERMISSIONS_BY_ROLE[user.role] || [];
}