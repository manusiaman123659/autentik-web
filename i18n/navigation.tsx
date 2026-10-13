"use client";

import NextLink from "next/link";
import { useRouter as useNextRouter } from "next/navigation";
import { createNavigation } from "next-intl/navigation";
import type { ComponentProps } from "react";
import { routing } from "./routing";
import { getPublicRoute } from "./locales";

const navigation = createNavigation(routing);
export const usePathname = navigation.usePathname;

function isUnprefixedPublicHref(href: string) {
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\")) return false;
  const route = getPublicRoute(href.split(/[?#]/)[0]);
  return route !== null && !route.prefixed;
}

export default function Link(props: ComponentProps<typeof NextLink>) {
  return props.locale === false || (typeof props.href === "string" && !isUnprefixedPublicHref(props.href))
    ? <NextLink {...props} /> : <navigation.Link {...props} locale={typeof props.locale === "string" ? props.locale : undefined} />;
}

export function useRouter() {
  const original = useNextRouter();
  const localized = navigation.useRouter();
  return {
    ...original,
    push: (href: string, options?: Parameters<typeof original.push>[1]) =>
      (isUnprefixedPublicHref(href) ? localized : original).push(href, options),
    replace: (href: string, options?: Parameters<typeof original.replace>[1]) =>
      (isUnprefixedPublicHref(href) ? localized : original).replace(href, options),
  };
}
