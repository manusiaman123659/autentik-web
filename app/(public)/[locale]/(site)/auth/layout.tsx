import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { isPublicLocale } from "@/i18n/locales";
import { loadMessages } from "@/i18n/messages";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await getLocale();
  const locale = isPublicLocale(current) ? current : "id";
  const { common, navigation, auth } = await loadMessages(locale);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={{ common, navigation, auth }}
      timeZone="Asia/Jakarta"
    >
      <div
        className="min-h-screen flex items-center justify-center px-4 py-12 public-page-hero"
      >
        <div className="w-full max-w-md">{children}</div>
      </div>
    </NextIntlClientProvider>
  );
}
