import { defineRouting } from "next-intl/routing";
import { locales, localeCookie } from "./locales";

export const routing = defineRouting({
  locales,
  defaultLocale: "id",
  localePrefix: { mode: "as-needed", prefixes: { "zh-CN": "/zh-cn" } },
  localeDetection: false,
  localeCookie: { name: localeCookie, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 },
  // Metadata uses the canonical origin, not request Host headers.
  alternateLinks: false,
});
