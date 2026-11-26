import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  APPLICATION_ROLES,
  canAccessSection,
  hasCapability,
  isCmsRole,
} from "../lib/admin-permissions";

describe("RBAC permissions (lib/admin-permissions)", () => {
  it("mengenali tepat 5 role aplikasi dan memisahkan customer dari CMS", () => {
    assert.deepEqual([...APPLICATION_ROLES], [
      "super_admin",
      "admin",
      "staff",
      "editor",
      "customer",
    ]);
    assert.equal(isCmsRole("super_admin"), true);
    assert.equal(isCmsRole("admin"), true);
    assert.equal(isCmsRole("staff"), true);
    assert.equal(isCmsRole("editor"), true);
    assert.equal(isCmsRole("customer"), false);
    assert.equal(isCmsRole("viewer"), false);
    assert.equal(isCmsRole(null), false);
  });

  it("membatasi capability sensitive dan users hanya untuk super_admin", () => {
    assert.equal(hasCapability("super_admin", "sensitive"), true);
    assert.equal(hasCapability("super_admin", "users"), true);
    assert.equal(hasCapability("admin", "sensitive"), false);
    assert.equal(hasCapability("admin", "users"), false);
    assert.equal(hasCapability("staff", "shipping"), false);
    assert.equal(hasCapability("editor", "operations"), false);
  });

  it("menegakkan akses section admin sesuai capability role", () => {
    assert.equal(canAccessSection("super_admin", "akses-staff"), true);
    assert.equal(canAccessSection("admin", "akses-staff"), false);
    assert.equal(canAccessSection("admin", "produk"), true);
    assert.equal(canAccessSection("admin", "riwayat"), true);
    assert.equal(canAccessSection("staff", "produk"), true);
    assert.equal(canAccessSection("staff", "riwayat"), false);
    assert.equal(canAccessSection("editor", "compro"), true);
    assert.equal(canAccessSection("editor", "orders"), false);
    assert.equal(canAccessSection("customer", "produk"), false);
    assert.equal(canAccessSection("super_admin", "non-existent"), false);
  });
});
