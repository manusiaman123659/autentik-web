import type { ProductRow } from "@/lib/admin-data";
import type { CareerPosition } from "@/lib/data/careers";
import { getCanonicalOrigin } from "@/lib/public-url";
import { localizeHref, type PublicLocale } from "@/i18n/locales";
import type { ResolvedProductContent } from "@/lib/product-translation-types";

const baseUrl = getCanonicalOrigin();

const COMPANY = {
  name: "PT Autentik Karya Analitika",
  url: baseUrl,
  logo: `${baseUrl}/images/logo_aka/LOGO_AKA.jpg`,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Jl. Klipang Ruko Amsterdam No.9E, Sendangmulyo, Tembalang",
    addressLocality: "Kota Semarang",
    addressRegion: "Jawa Tengah",
    postalCode: "50272",
    addressCountry: "ID",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "sales",
    email: "autentik.info@gmail.com",
    availableLanguage: ["Indonesian"],
  },
};

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    ...COMPANY,
    sameAs: [],
  };
}

export function productSchema(product: ProductRow, locale: PublicLocale = "id", display?: Pick<ResolvedProductContent, "name" | "description">) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: display?.name ?? product.name,
    image: product.image_url || undefined,
    description: display?.description ?? product.description,
    brand: {
      "@type": "Brand",
      name: product.brand,
    },
    sku: product.sku || undefined,
    category: product.category,
    url: `${baseUrl}${localizeHref(`/products/${product.slug}`, locale)}`,
  };
}

export function productOfferSchema(product: ProductRow, locale: PublicLocale = "id") {
  const availability =
    product.stock != null && product.stock > 0
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.image_url || undefined,
    description: product.description,
    brand: {
      "@type": "Brand",
      name: product.brand,
    },
    sku: product.sku || undefined,
    category: product.category,
    url: `${baseUrl}${localizeHref(`/store/${product.slug}`, locale)}`,
    offers: {
      "@type": "Offer",
      url: `${baseUrl}${localizeHref(`/store/${product.slug}`, locale)}`,
      priceCurrency: "IDR",
      price: product.price ?? undefined,
      availability,
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: COMPANY.name,
      },
    },
  };
}

const EMPLOYMENT_MAP: Record<string, string> = {
  "Full-time": "FULL_TIME",
  Magang: "INTERN",
  Contract: "CONTRACT",
};

export function jobPostingSchema(job: CareerPosition) {
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: new Date().toISOString(),
    hiringOrganization: {
      "@type": "Organization",
      name: COMPANY.name,
      sameAs: COMPANY.url,
      logo: COMPANY.logo,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Semarang",
        addressRegion: "Jawa Tengah",
        addressCountry: "ID",
      },
    },
    employmentType: EMPLOYMENT_MAP[job.type] ?? "OTHER",
    jobLocationType: job.location === "Office" ? "TELECOMMUTE" : undefined,
    validThrough: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString(),
    identifier: {
      "@type": "PropertyValue",
      name: COMPANY.name,
      value: job.slug,
    },
  };
}
