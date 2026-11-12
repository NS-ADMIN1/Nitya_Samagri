import { effectivePermissions, PERMISSION_KEYS } from "../../src/config/permissions";

describe("effectivePermissions()", () => {
  it("gives the super admin every permission", () => {
    expect(effectivePermissions({ role: "super_admin", permissions: [] })).toEqual(PERMISSION_KEYS);
  });

  it("uses the member's own saved list when there is one", () => {
    expect(effectivePermissions({ role: "warehouse", permissions: ["orders.manage"] })).toEqual(["orders.manage"]);
  });

  it("falls back to the role's defaults when nothing is saved", () => {
    expect(effectivePermissions({ role: "warehouse", permissions: [] })).toEqual(["inventory.manage", "orders.view"]);
    expect(effectivePermissions({ role: "support" })).toEqual(["orders.view", "users.view"]);
  });

  it("gives a customer nothing", () => {
    expect(effectivePermissions({ role: "customer" })).toEqual([]);
  });
});
