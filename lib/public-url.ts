const NGROK_HOST_SUFFIXES = [
  ".ngrok-free.dev",
  ".ngrok-free.app",
  ".ngrok.io",
];

function parseHttpUrl(value: string): URL | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (parsed.username || parsed.password) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isNgrokHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return NGROK_HOST_SUFFIXES.some(
    (suffix) => normalized === suffix.slice(1) || normalized.endsWith(suffix),
  );
}

export function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "0.0.0.0" ||
    normalized === "::" ||
    normalized === "[::]" ||
    normalized === "::1" ||
    normalized === "[::1]" ||
    /^127(?:\.\d{1,3}){3}$/.test(normalized)
  );
}

export function getCanonicalOrigin(fallbackUrl?: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (configured) {
    const parsed = parseHttpUrl(configured);
    const isOriginOnly =
      parsed?.pathname === "/" && !parsed.search && !parsed.hash;
    const isValidProductionOrigin =
      parsed?.protocol === "https:" &&
      !isLocalHostname(parsed.hostname) &&
      !isNgrokHostname(parsed.hostname);

    if (parsed && isOriginOnly && (!isProduction || isValidProductionOrigin)) {
      return parsed.origin;
    }

    if (isProduction) {
      throw new Error(
        "NEXT_PUBLIC_SITE_URL wajib berupa origin HTTPS publik yang valid pada production.",
      );
    }
  } else if (isProduction) {
    throw new Error("NEXT_PUBLIC_SITE_URL wajib diatur pada production.");
  }

  if (fallbackUrl) {
    const parsedFallback = parseHttpUrl(fallbackUrl);
    if (parsedFallback) return parsedFallback.origin;
  }

  return "http://localhost:3000";
}

export function getSafeExternalUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const parsed = parseHttpUrl(value.trim());
  if (!parsed) return null;

  if (
    process.env.NODE_ENV === "production" &&
    (parsed.protocol !== "https:" ||
      isLocalHostname(parsed.hostname) ||
      isNgrokHostname(parsed.hostname))
  ) {
    return null;
  }

  return parsed.toString();
}
