const CUSTOMER_ROUTE_PREFIX = "/store";

export function getSafeCustomerRedirect(
  value: string | null | undefined,
  fallback = CUSTOMER_ROUTE_PREFIX,
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  try {
    const baseUrl = "https://customer-route.invalid";
    const parsed = new URL(value, baseUrl);
    const isCustomerRoute =
      parsed.pathname === CUSTOMER_ROUTE_PREFIX ||
      parsed.pathname.startsWith(`${CUSTOMER_ROUTE_PREFIX}/`);

    if (parsed.origin !== baseUrl || !isCustomerRoute) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Resolves the canonical origin for redirects.
 * Prioritizes NEXT_PUBLIC_SITE_URL if configured with http: or https:.
 * Normalizes by removing trailing slashes and validating protocol.
 * Falls back safely to request origin or localhost:3000.
 */
export function getCanonicalOrigin(fallbackUrl?: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return configured.replace(/\/+$/, "");
      }
    } catch {
      // Fall through to fallback
    }
  }

  if (fallbackUrl) {
    try {
      const parsed = new URL(fallbackUrl);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.origin;
      }
    } catch {
      // Fall through
    }
  }

  return "http://localhost:3000";
}
