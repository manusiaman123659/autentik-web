import type { Metadata } from "next";
import { getCanonicalOrigin } from "@/lib/public-url";
import { localeAlternates, localizeHref, type PublicLocale } from "./locales";

export const siteMetadata: Metadata = {
  metadataBase: new URL(getCanonicalOrigin()),
  title: "PT Autentik Karya Analitika | Smart Technology is Yours",
  description: "Solusi penyedia produk industri dengan teknologi IoT. PT Autentik Karya Analitika memproduksi dan memasarkan IoT Quality Monitoring Devices berbasis kebutuhan industri dan teknologi IoT.",
  openGraph: {
    title: "PT Autentik Karya Analitika | Smart Technology is Yours",
    description: "PT Autentik Karya Analitika — Solusi penyedia produk industri dengan teknologi IoT. Mempercayakan produksi lokal berjaya di negeri sendiri.",
    type: "website", locale: "id_ID", siteName: "PT Autentik Karya Analitika",
  },
};

export function publicMetadata(pathname: string, locale: PublicLocale, content?: { title?: string; description?: string }): Metadata {
  const canonical = localizeHref(pathname, locale);
  const transactional = /^\/(auth|store\/(cart|checkout|orders))(\/|$)/.test(pathname);
  return {
    ...siteMetadata,
    ...content,
    alternates: { canonical, languages: localeAlternates(pathname) },
    openGraph: { ...siteMetadata.openGraph, ...content, url: canonical, locale: { id: "id_ID", en: "en_US", "zh-CN": "zh_CN" }[locale] },
    ...(transactional ? { robots: { index: false, follow: false } } : {}),
  };
}
