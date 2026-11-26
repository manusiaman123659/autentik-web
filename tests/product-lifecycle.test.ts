import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getLifecycleActionCopy,
  lifecycleActions,
  readProductLifecycle,
} from "../lib/product-lifecycle";
import {
  productLifecycleInputSchema,
  productLifecycleRowSchema,
} from "../lib/validations/productLifecycleSchema";

describe("Product Lifecycle 2-tahap (lib/product-lifecycle)", () => {
  it("memetakan state ACTIVE, ARCHIVED, dan TRASHED untuk B2B dan Komponen", () => {
    const active = readProductLifecycle({
      id: "prod-1",
      slug: "prod-1",
      product_type: "b2b_system",
      deleted_at: null,
      trashed_at: null,
      lifecycle_version: 0,
    });
    assert.deepEqual(active, { state: "ACTIVE", version: 0, productType: "b2b_system" });

    const archived = readProductLifecycle({
      id: "comp-1",
      slug: "comp-1",
      product_type: "sparepart",
      deleted_at: "2026-11-26T00:00:00Z",
      trashed_at: null,
      lifecycle_version: 1,
    });
    assert.deepEqual(archived, { state: "ARCHIVED", version: 1, productType: "sparepart" });

    const trashed = readProductLifecycle({
      id: "comp-1",
      slug: "comp-1",
      product_type: "sparepart",
      deleted_at: "2026-11-26T00:00:00Z",
      trashed_at: "2026-11-26T01:00:00Z",
      lifecycle_version: 2,
    });
    assert.deepEqual(trashed, { state: "TRASHED", version: 2, productType: "sparepart" });
  });

  it("menolak state tidak konsisten (trashed_at terisi saat deleted_at null)", () => {
    const invalid = productLifecycleRowSchema.safeParse({
      id: "prod-bad",
      slug: "prod-bad",
      product_type: "b2b_system",
      deleted_at: null,
      trashed_at: "2026-11-26T01:00:00Z",
      lifecycle_version: 1,
    });
    assert.equal(invalid.success, false);
  });

  it("membatasi restore_to_archive (Sampah) khusus super_admin", () => {
    assert.deepEqual(
      lifecycleActions("ACTIVE", { canManage: true, canRestoreTrashed: false }),
      ["archive"],
    );
    assert.deepEqual(
      lifecycleActions("ARCHIVED", { canManage: true, canRestoreTrashed: false }),
      ["restore_to_draft", "trash"],
    );
    assert.deepEqual(
      lifecycleActions("TRASHED", { canManage: true, canRestoreTrashed: false }),
      [],
    );
    assert.deepEqual(
      lifecycleActions("TRASHED", { canManage: true, canRestoreTrashed: true }),
      ["restore_to_archive"],
    );
    assert.deepEqual(
      lifecycleActions("ACTIVE", { canManage: false, canRestoreTrashed: false }),
      [],
    );
  });

  it("memvalidasi input requestId UUID dan menghasilkan copy Bahasa Indonesia yang benar", () => {
    const valid = productLifecycleInputSchema.safeParse({
      productId: "talpha-tc-01",
      expectedVersion: 0,
      requestId: "550E8400-E29B-41D4-A716-446655440000",
    });
    assert.equal(valid.success, true);
    if (valid.success) {
      assert.equal(valid.data.requestId, "550e8400-e29b-41d4-a716-446655440000");
    }

    const trashCopy = getLifecycleActionCopy("trash", "sparepart");
    assert.equal(trashCopy.tone, "danger");
    assert.match(trashCopy.description, /Super Admin/);
  });
});
