"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { ChevronDown, Languages } from "lucide-react";
import { isPublicLocale, localeCookie, localizeHref, type PublicLocale } from "@/i18n/locales";

const names: Record<PublicLocale, string> = { id: "Bahasa Indonesia", en: "English", "zh-CN": "简体中文" };
const shortNames: Record<PublicLocale, string> = { id: "ID", en: "EN", "zh-CN": "中文" };

export default function LanguageSwitcher({ mobile = false }: { mobile?: boolean }) {
  const locale = useLocale() as PublicLocale;
  const t = useTranslations("common");
  const router = useRouter();
  return <label className={`relative min-h-11 items-center gap-2 rounded-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#0EA5A0] ${mobile ? "flex w-full" : "hidden w-20 shrink-0 justify-center hover:bg-[var(--bg-card-hover)] xl:flex"}`}
    style={{ color: "var(--text-secondary)" }}>
    <Languages size={18} aria-hidden="true" className="shrink-0" />
    <span className="sr-only">{t("languageSelector", { language: names[locale] })}</span>
    {!mobile && <><span aria-hidden="true" className="pointer-events-none text-xs font-semibold">{shortNames[locale]}</span><ChevronDown size={12} aria-hidden="true" className="pointer-events-none" /></>}
    <select value={locale} data-language-switcher={mobile ? "mobile" : "desktop"}
      className={mobile ? "min-h-11 min-w-0 flex-1 cursor-pointer rounded-sm border px-3 text-sm" : "absolute inset-0 h-full w-full cursor-pointer opacity-0"}
      style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
      onChange={event => {
        const next = event.target.value;
        if (!isPublicLocale(next)) return;
        document.cookie = `${localeCookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
        router.replace(localizeHref(`${location.pathname}${location.search}${location.hash}`, next), { scroll: false });
      }}>
      <option value="id" lang="id">Bahasa Indonesia</option>
      <option value="en" lang="en">English</option>
      <option value="zh-CN" lang="zh-CN">简体中文</option>
    </select>
  </label>;
}
