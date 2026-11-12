import { getTranslations } from "next-intl/server";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.metadata" });
  return {
    title: t("forgotTitle"),
    description: t("forgotDescription"),
    referrer: "no-referrer",
    robots: { index: false, follow: false },
  };
}

export default async function CustomerForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.forgot" });

  return (
    <div className="rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-slate-900 border border-white/10">
      <div className="px-8 pt-8 pb-6 text-center">
        <h1 className="text-2xl font-bold mb-1 text-slate-900 dark:text-white">
          {t("title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("subtitle")}
        </p>
      </div>

      <div className="px-8 pb-8">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
