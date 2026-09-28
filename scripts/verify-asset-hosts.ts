import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createSupabasePublicMediaPattern,
  resolveAkaProductMediaUrl,
} from "../lib/supabase-public-media";
import {
  isStorageObjectMissingError,
  resolveTechnicalDocumentMediaUrl,
} from "../lib/technical-document-media";

const configured = "https://example-project.supabase.co";
const pattern = createSupabasePublicMediaPattern(configured, true);
assert.ok(pattern);
assert.equal(pattern.hostname, "example-project.supabase.co");
assert.equal(pattern.pathname, "/storage/v1/object/public/media/**");

const matchesPattern = (raw: string) => {
  const url = new URL(raw);
  return url.protocol === `${pattern.protocol}:`
    && url.hostname === pattern.hostname
    && url.port === pattern.port
    && url.search === ""
    && url.pathname.startsWith("/storage/v1/object/public/media/");
};

assert.equal(matchesPattern(`${configured}/storage/v1/object/public/media/products/item.jpg`), true);
assert.equal(matchesPattern(`${configured}/storage/v1/object/public/technical-documents/file.pdf`), false);
assert.equal(matchesPattern(`${configured}/storage/v1/object/sign/technical-documents/file.pdf`), false);
assert.equal(matchesPattern("https://other-project.supabase.co/storage/v1/object/public/media/products/item.jpg"), false);
assert.equal(matchesPattern("http://example-project.supabase.co/storage/v1/object/public/media/products/item.jpg"), false);
assert.equal(createSupabasePublicMediaPattern(undefined, false), null);
assert.throws(() => createSupabasePublicMediaPattern(undefined, true));
assert.throws(() => createSupabasePublicMediaPattern("not a url"));
assert.throws(() => createSupabasePublicMediaPattern("http://localhost:54321"));

const managed = `${configured}/storage/v1/object/public/media/brochures/b2b_system/catalog%20aka.pdf`;
assert.deepEqual(resolveAkaProductMediaUrl(managed, configured), {
  kind: "managed",
  path: "brochures/b2b_system/catalog aka.pdf",
});
assert.deepEqual(resolveAkaProductMediaUrl(`${managed}?download=1#page=2`, configured), {
  kind: "managed",
  path: "brochures/b2b_system/catalog aka.pdf",
});
assert.deepEqual(
  resolveAkaProductMediaUrl(
    "https://cdn.example.com/storage/v1/object/public/media/models/b2b_system/model.glb",
    configured,
  ),
  { kind: "external" },
);
assert.deepEqual(
  resolveAkaProductMediaUrl(
    "https://other-project.supabase.co/storage/v1/object/public/media/models/b2b_system/model.glb",
    configured,
  ),
  { kind: "external" },
);
assert.deepEqual(resolveAkaProductMediaUrl("not a url", configured), { kind: "unrecognized" });
assert.deepEqual(
  resolveAkaProductMediaUrl(`${configured}/storage/v1/object/public/media/`, configured),
  { kind: "unrecognized" },
);
assert.deepEqual(
  resolveAkaProductMediaUrl(
    `${configured}/storage/v1/object/public/media/models%2Fb2b/model.glb`,
    configured,
  ),
  { kind: "unrecognized" },
);

const productAction = readFileSync("lib/actions/products.ts", "utf8");
assert.equal(
  productAction.includes("resolveAkaProductMediaUrl(url, process.env.NEXT_PUBLIC_SUPABASE_URL)"),
  true,
);
assert.equal(productAction.includes('resolved.kind !== "managed"'), true);
assert.equal(productAction.includes("remove([resolved.path])"), true);

const documentUrl = `${configured}/storage/v1/object/public/media/documents/product-1/file.pdf`;
assert.deepEqual(resolveTechnicalDocumentMediaUrl(documentUrl, "product-1", configured), {
  kind: "managed",
  path: "documents/product-1/file.pdf",
});
assert.equal(
  resolveTechnicalDocumentMediaUrl("https://cdn.example.com/file.pdf", "product-1", configured).kind,
  "external",
);
assert.equal(isStorageObjectMissingError({ code: "NoSuchKey", status: 400 }), true);

console.log("Asset host and cleanup assertions passed.");
