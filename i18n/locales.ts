export const locales = ["id", "en", "zh-CN"] as const;
export type PublicLocale = (typeof locales)[number];
export const localeCookie = "autentik-locale";

export function isPublicLocale(value: unknown): value is PublicLocale {
  return locales.some(locale => locale === value);
}

const publicSections = new Set([
  "products", "about", "store", "services", "research-partnership", "distributors",
  "contact", "careers", "custom-request", "privacy-policy", "terms-of-service",
]);

export function getPublicRoute(pathname: string): { locale: PublicLocale; pathname: string; prefixed: boolean } | null {
  if (/\.(?:svg|png|jpe?g|gif|webp|ico|avif|pdf|glb|gltf|bin|zip|woff2?|ttf|otf|css|js|map|mp4|webm|mp3|wav|docx?|xlsx?|csv|txt|xml|json)$/i.test(pathname)) return null;
  const segments = pathname.split("/");
  const prefix = segments[1];
  const locale: PublicLocale = prefix === "en" ? "en" : prefix === "zh-cn" ? "zh-CN" : "id";
  const prefixed = prefix === "en" || prefix === "zh-cn" || prefix === "id";
  const bare = prefixed ? `/${segments.slice(2).join("/")}` : pathname;
  const section = bare.split("/")[1];
  const authPage = /^\/auth\/(login|register)\/?$/.test(bare);
  if (bare !== "/" && !publicSections.has(section) && !authPage) return null;
  return { locale, pathname: bare, prefixed };
}

export function localizeHref(href: string, locale: PublicLocale): string {
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\")) return href;
  const split = href.search(/[?#]/);
  const pathname = split < 0 ? href : href.slice(0, split);
  const suffix = split < 0 ? "" : href.slice(split);
  const route = getPublicRoute(pathname);
  if (!route) return href;
  const prefix = locale === "en" ? "/en" : locale === "zh-CN" ? "/zh-cn" : "";
  return `${prefix}${route.pathname === "/" && prefix ? "" : route.pathname}${suffix}`;
}

export function localeAlternates(pathname: string) {
  return {
    id: localizeHref(pathname, "id"),
    en: localizeHref(pathname, "en"),
    "zh-CN": localizeHref(pathname, "zh-CN"),
    "x-default": localizeHref(pathname, "id"),
  };
}
