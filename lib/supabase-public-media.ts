export const SUPABASE_PUBLIC_MEDIA_PATHNAME = "/storage/v1/object/public/media/**";

const SUPABASE_PUBLIC_MEDIA_PREFIX = "/storage/v1/object/public/media/";
const PRODUCT_MEDIA_PREFIXES = ["products/", "brochures/", "models/"];

export type SupabasePublicMediaPattern = {
  protocol: "https";
  hostname: string;
  port: string;
  pathname: typeof SUPABASE_PUBLIC_MEDIA_PATHNAME;
  search: "";
};

export type AkaPublicMediaUrl =
  | { kind: "managed"; path: string }
  | { kind: "external" }
  | { kind: "unrecognized" };

function parseSupabaseOrigin(value: string | undefined): URL | null {
  const configured = value?.trim();
  if (!configured) return null;

  const parsed = new URL(configured);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password
    || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL wajib berupa origin HTTPS Supabase yang valid.");
  }
  return parsed;
}

export function createSupabasePublicMediaPattern(
  value: string | undefined,
  required = false,
): SupabasePublicMediaPattern | null {
  let parsed: URL | null;
  try {
    parsed = parseSupabaseOrigin(value);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL wajib berupa origin HTTPS Supabase yang valid.");
  }
  if (!parsed) {
    if (required) throw new Error("NEXT_PUBLIC_SUPABASE_URL wajib diatur saat build production.");
    return null;
  }

  return {
    protocol: "https",
    hostname: parsed.hostname,
    port: parsed.port,
    pathname: SUPABASE_PUBLIC_MEDIA_PATHNAME,
    search: "",
  };
}

/** Resolve only public product media owned by the configured AKA Supabase project. */
export function resolveAkaProductMediaUrl(
  value: string | null | undefined,
  supabaseUrl: string | undefined,
): AkaPublicMediaUrl {
  if (!value) return { kind: "unrecognized" };

  let project: URL;
  let url: URL;
  try {
    const parsedProject = parseSupabaseOrigin(supabaseUrl);
    if (!parsedProject) return { kind: "unrecognized" };
    project = parsedProject;
    url = new URL(value);
  } catch {
    return { kind: "unrecognized" };
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    return { kind: "unrecognized" };
  }
  if (url.origin !== project.origin) return { kind: "external" };
  if (!url.pathname.startsWith(SUPABASE_PUBLIC_MEDIA_PREFIX)) {
    return { kind: "unrecognized" };
  }

  const encodedPath = url.pathname.slice(SUPABASE_PUBLIC_MEDIA_PREFIX.length);
  if (!encodedPath || /%(?:00|2f|5c)/i.test(encodedPath)) {
    return { kind: "unrecognized" };
  }

  let path: string;
  try {
    path = decodeURIComponent(encodedPath);
  } catch {
    return { kind: "unrecognized" };
  }

  const segments = path.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("\\"))
    || !PRODUCT_MEDIA_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return { kind: "unrecognized" };
  }

  return { kind: "managed", path };
}
