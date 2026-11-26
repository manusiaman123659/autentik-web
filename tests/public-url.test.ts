import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  getCanonicalOrigin,
  getSafeExternalUrl,
  isLocalHostname,
  isNgrokHostname,
} from "../lib/public-url";

const ORIGINAL_ENV = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
};

afterEach(() => {
  (process.env as Record<string, string | undefined>).NODE_ENV = ORIGINAL_ENV.NODE_ENV;
  if (ORIGINAL_ENV.NEXT_PUBLIC_SITE_URL === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_ENV.NEXT_PUBLIC_SITE_URL;
  }
});

describe("Public URL & Canonical Origin guard (lib/public-url)", () => {
  it("mendeteksi hostname lokal dan ngrok", () => {
    assert.equal(isLocalHostname("localhost"), true);
    assert.equal(isLocalHostname("127.0.0.1"), true);
    assert.equal(isLocalHostname("::1"), true);
    assert.equal(isLocalHostname("autentik.co.id"), false);

    assert.equal(isNgrokHostname("abc.ngrok-free.app"), true);
    assert.equal(isNgrokHostname("abc.ngrok-free.dev"), true);
    assert.equal(isNgrokHostname("autentik.co.id"), false);
  });

  it("menolak origin non-HTTPS atau lokal pada production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    assert.throws(() => getCanonicalOrigin(), /HTTPS publik/);

    process.env.NEXT_PUBLIC_SITE_URL = "https://demo.ngrok-free.app";
    assert.throws(() => getCanonicalOrigin(), /HTTPS publik/);

    process.env.NEXT_PUBLIC_SITE_URL = "https://autentik.co.id";
    assert.equal(getCanonicalOrigin(), "https://autentik.co.id");
  });

  it("menolak URL berbahaya atau berkredensial pada getSafeExternalUrl", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    assert.equal(getSafeExternalUrl("javascript:alert(1)"), null);
    assert.equal(getSafeExternalUrl("https://user:pass@autentik.co.id"), null);
    assert.equal(getSafeExternalUrl("http://autentik.co.id"), null);
    assert.equal(getSafeExternalUrl("https://autentik.co.id/products"), "https://autentik.co.id/products");
  });
});
