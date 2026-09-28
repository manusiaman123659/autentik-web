export type ManagedMediaUrl =
  | { kind: "managed"; path: string }
  | { kind: "external" }
  | { kind: "unrecognized" };

/** Resolve only objects uploaded by the technical-documents UI for this product. */
export function resolveTechnicalDocumentMediaUrl(
  value: string | null,
  productId: string,
  supabaseUrl: string | undefined,
): ManagedMediaUrl {
  if (!value || !productId || !supabaseUrl) return { kind: "unrecognized" };

  try {
    const url = new URL(value);
    const project = new URL(supabaseUrl);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      return { kind: "unrecognized" };
    }

    const basePath = project.pathname.replace(/\/+$/, "");
    const prefix = `${basePath}/storage/v1/object/public/media/`;
    if (url.origin !== project.origin || !url.pathname.startsWith(prefix)) {
      // A Storage-looking URL (or an unknown URL on our own origin) must not
      // silently become an "external" URL and skip managed-object cleanup.
      return url.origin === project.origin || url.pathname.includes("/storage/v1/object/public/media/")
        ? { kind: "unrecognized" }
        : { kind: "external" };
    }

    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    const folder = `documents/${productId}/`;
    const fileName = path.startsWith(folder) ? path.slice(folder.length) : "";
    if (!fileName || fileName === "." || fileName === ".." || fileName.includes("/") || fileName.includes("\\")) {
      return { kind: "unrecognized" };
    }

    return { kind: "managed", path };
  } catch {
    return { kind: "unrecognized" };
  }
}

type StorageRemoval = {
  remove(paths: string[]): Promise<{ data?: unknown; error: unknown }>;
  info(path: string): Promise<{ data: unknown; error: { status?: number } | null }>;
};

export function isStorageObjectMissingError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; status?: unknown };
  return value.code === "NoSuchKey" || value.status === 404;
}

export function storageErrorDiagnostic(error: unknown) {
  const value = error && typeof error === "object"
    ? error as { code?: unknown; statusCode?: unknown; status?: unknown; name?: unknown }
    : {};
  const rawCode = value.code ?? value.statusCode;
  return {
    error_code: typeof rawCode === "string" && /^[a-zA-Z0-9_.-]{1,64}$/.test(rawCode) ? rawCode : null,
    error_status: typeof value.status === "number" && value.status >= 100 && value.status <= 599
      ? value.status
      : null,
    error_name: typeof value.name === "string"
      && ["StorageApiError", "StorageError", "StorageUnknownError", "Error", "TypeError"].includes(value.name)
      ? value.name
      : null,
  };
}

function removeErrorDiagnostic(error: unknown) {
  const details = storageErrorDiagnostic(error);
  return {
    remove_error_code: details.error_code,
    remove_error_status: details.error_status,
    remove_error_name: details.error_name,
  };
}

type RemovalDiagnostics = {
  documentId: string;
  bucket: "media" | "technical-documents";
  classification: "managed" | "private";
};

/** Storage remove can return `data: []` without error; verify absence separately. */
export async function removeStorageObjectAndVerify(
  storage: StorageRemoval,
  path: string,
  diagnostics?: RemovalDiagnostics,
): Promise<boolean> {
  let removed;
  try {
    removed = await storage.remove([path]);
  } catch (error) {
    if (diagnostics) console.info("[technical-documents]", {
      event: "technical_document_storage_remove",
      document_id: diagnostics.documentId,
      bucket: diagnostics.bucket,
      classification: diagnostics.classification,
      remove_had_error: true,
      remove_data_count: null,
      ...removeErrorDiagnostic(error),
    });
    return false;
  }

  if (diagnostics) console.info("[technical-documents]", {
    event: "technical_document_storage_remove",
    document_id: diagnostics.documentId,
    bucket: diagnostics.bucket,
    classification: diagnostics.classification,
    remove_had_error: Boolean(removed.error),
    remove_data_count: Array.isArray(removed.data) ? removed.data.length : null,
    ...removeErrorDiagnostic(removed.error),
  });
  if (removed.error) return false;

  try {
    const checked = await storage.info(path);
    const missing = checked.data == null && isStorageObjectMissingError(checked.error);
    if (diagnostics) console.info("[technical-documents]", {
      event: "technical_document_storage_verify_missing",
      document_id: diagnostics.documentId,
      bucket: diagnostics.bucket,
      verification_method: "info",
      object_exists: checked.data != null ? true : missing ? false : null,
      verification_failed: !missing,
      ...storageErrorDiagnostic(checked.error),
    });
    return missing;
  } catch (error) {
    if (diagnostics) console.info("[technical-documents]", {
      event: "technical_document_storage_verify_missing",
      document_id: diagnostics.documentId,
      bucket: diagnostics.bucket,
      verification_method: "info",
      object_exists: null,
      verification_failed: true,
      ...storageErrorDiagnostic(error),
    });
    return false;
  }
}

export async function removeBeforeWrite<T>(
  storage: StorageRemoval,
  path: string,
  write: () => Promise<T>,
  diagnostics?: RemovalDiagnostics,
): Promise<{ removed: false } | { removed: true; result: T }> {
  if (!await removeStorageObjectAndVerify(storage, path, diagnostics)) return { removed: false };
  return { removed: true, result: await write() };
}
