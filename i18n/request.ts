import * as rootParams from "next/root-params";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { isPublicLocale } from "./locales";
import { loadMessages } from "./messages";

export default getRequestConfig(async ({ locale }) => {
  const resolved = locale ?? await rootParams.locale();
  if (!isPublicLocale(resolved)) notFound();
  return { locale: resolved, messages: await loadMessages(resolved), timeZone: "Asia/Jakarta" };
});
