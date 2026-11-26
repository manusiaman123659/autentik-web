import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MIKA_DEFAULT_LIMIT,
  MIKA_MAX_LIMIT,
  encodeMikaCursor,
  parseMikaPagination,
} from "../lib/validations/mikaIntegrationSchema";

describe("MIKA Sync API pagination & cursor (lib/validations/mikaIntegrationSchema)", () => {
  it("melakukan encode/decode cursor snapshot secara valid dan menolak lintas resource", () => {
    const cursor = encodeMikaCursor("talpha-tc-01", "products");
    const ok = parseMikaPagination(new URLSearchParams({ limit: "50", cursor }), "products");
    assert.deepEqual(ok, {
      success: true,
      data: { limit: 50, lastId: "talpha-tc-01" },
    });

    const wrongResource = parseMikaPagination(new URLSearchParams({ cursor }), "brands");
    assert.deepEqual(wrongResource, { success: false, code: "INVALID_CURSOR" });
  });

  it("menerapkan batas limit dan menolak parameter asing atau duplikat", () => {
    const defaultResult = parseMikaPagination(new URLSearchParams(), "products");
    assert.deepEqual(defaultResult, {
      success: true,
      data: { limit: MIKA_DEFAULT_LIMIT, lastId: null },
    });

    const tooLarge = parseMikaPagination(
      new URLSearchParams({ limit: String(MIKA_MAX_LIMIT + 1) }),
      "products",
    );
    assert.deepEqual(tooLarge, { success: false, code: "INVALID_QUERY" });

    const unknownKey = parseMikaPagination(new URLSearchParams({ foo: "bar" }), "products");
    assert.deepEqual(unknownKey, { success: false, code: "INVALID_QUERY" });

    const malformedCursor = parseMikaPagination(new URLSearchParams({ cursor: "not-valid!" }), "products");
    assert.deepEqual(malformedCursor, { success: false, code: "INVALID_CURSOR" });
  });
});
