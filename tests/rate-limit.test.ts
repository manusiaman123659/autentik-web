import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  checkRateLimit,
  checkRateLimitAsync,
  resetRateLimitStore,
} from "../lib/rate-limit";

describe("Rate limiter (lib/rate-limit)", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("mengizinkan request hingga batas limit lalu menolak request berikutnya", () => {
    const first = checkRateLimit("ip:1", 2, 10_000);
    const second = checkRateLimit("ip:1", 2, 10_000);
    const third = checkRateLimit("ip:1", 2, 10_000);

    assert.deepEqual(first, { allowed: true, remaining: 1 });
    assert.deepEqual(second, { allowed: true, remaining: 0 });
    assert.deepEqual(third, { allowed: false, remaining: 0 });
  });

  it("mereset counter setelah window berakhir dan fallback aman pada checkRateLimitAsync", async () => {
    const blocked1 = checkRateLimit("ip:2", 1, 20);
    const blocked2 = checkRateLimit("ip:2", 1, 20);
    assert.equal(blocked1.allowed, true);
    assert.equal(blocked2.allowed, false);

    await new Promise((resolve) => setTimeout(resolve, 35));
    const afterWindow = await checkRateLimitAsync("ip:2", 1, 20);
    assert.equal(afterWindow.allowed, true);
  });
});
