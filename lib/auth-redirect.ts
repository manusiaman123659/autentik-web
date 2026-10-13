import { getPublicRoute } from "@/i18n/locales";

const CUSTOMER_ROUTE_PREFIX = "/store";

export { getCanonicalOrigin } from "@/lib/public-url";

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
    const route = getPublicRoute(parsed.pathname);
    const isCustomerRoute = route &&
      (route.pathname === CUSTOMER_ROUTE_PREFIX || route.pathname.startsWith(`${CUSTOMER_ROUTE_PREFIX}/`)) &&
      !parsed.pathname.startsWith("/id/");

    if (parsed.origin !== baseUrl || !isCustomerRoute) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
