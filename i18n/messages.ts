import common from "@/messages/id/common.json";
import navigation from "@/messages/id/navigation.json";
import auth from "@/messages/id/auth.json";
import englishAuth from "@/messages/en/auth.json";
import chineseAuth from "@/messages/zh-CN/auth.json";
import home from "@/messages/id/home.json";
import englishHome from "@/messages/en/home.json";
import englishCompany from "@/messages/en/company.json";
import englishDocuments from "@/messages/en/documents.json";
import chineseHome from "@/messages/zh-CN/home.json";
import chineseCompany from "@/messages/zh-CN/company.json";
import chineseDocuments from "@/messages/zh-CN/documents.json";
import company from "@/messages/id/company.json";
import documents from "@/messages/id/documents.json";
import services from "@/messages/id/services.json";
import distribution from "@/messages/id/distribution.json";
import research from "@/messages/id/research.json";
import englishServices from "@/messages/en/services.json";
import englishDistribution from "@/messages/en/distribution.json";
import englishResearch from "@/messages/en/research.json";
import chineseServices from "@/messages/zh-CN/services.json";
import chineseDistribution from "@/messages/zh-CN/distribution.json";
import chineseResearch from "@/messages/zh-CN/research.json";
import contact from "@/messages/id/contact.json";
import requests from "@/messages/id/requests.json";
import legal from "@/messages/id/legal.json";
import englishContact from "@/messages/en/contact.json";
import englishRequests from "@/messages/en/requests.json";
import englishLegal from "@/messages/en/legal.json";
import chineseContact from "@/messages/zh-CN/contact.json";
import chineseRequests from "@/messages/zh-CN/requests.json";
import chineseLegal from "@/messages/zh-CN/legal.json";
import type { PublicLocale } from "./locales";
import products from "@/messages/id/products.json";
import englishProducts from "@/messages/en/products.json";
import chineseProducts from "@/messages/zh-CN/products.json";
import careers from "@/messages/id/careers.json";
import englishCareers from "@/messages/en/careers.json";
import chineseCareers from "@/messages/zh-CN/careers.json";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

export function mergeMessages<T>(base: T, translated: unknown): T {
  if (isPlainObject(base)) {
    const selected = isPlainObject(translated) ? translated : {};
    return Object.fromEntries(Object.entries(base).map(([key, value]) => [key, mergeMessages(value, selected[key])])) as T;
  }
  if (Array.isArray(base)) return (Array.isArray(translated) ? translated : base) as T;
  return (typeof translated === "string" && translated.trim() ? translated : base) as T;
}

export async function loadMessages(locale: PublicLocale) {
  const base = { common, navigation, auth, home, company, documents, services, distribution, research, contact, requests, legal, products, careers };
  if (locale === "id") return base;
  const translated = locale === "en"
    ? { common: (await import("@/messages/en/common.json")).default, navigation: (await import("@/messages/en/navigation.json")).default, auth: englishAuth,
      // Explicit server imports keep the new catalog leaves in Turbopack's HMR graph.
      home: englishHome, company: englishCompany, documents: englishDocuments,
      services: englishServices, distribution: englishDistribution, research: englishResearch,
      contact: englishContact, requests: englishRequests, legal: englishLegal, products: englishProducts, careers: englishCareers }
    : { common: (await import("@/messages/zh-CN/common.json")).default, navigation: (await import("@/messages/zh-CN/navigation.json")).default, auth: chineseAuth,
      home: chineseHome, company: chineseCompany, documents: chineseDocuments,
      services: chineseServices, distribution: chineseDistribution, research: chineseResearch,
      contact: chineseContact, requests: chineseRequests, legal: chineseLegal, products: chineseProducts, careers: chineseCareers };
  return mergeMessages(base, translated);
}
