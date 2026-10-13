import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { isPublicLocale } from "@/i18n/locales";
import { loadMessages } from "@/i18n/messages";
import { publicMetadata } from "@/i18n/metadata";
import { resolvePublicB2BProducts } from "@/lib/public-b2b-products";
import { toB2BHomeView } from "@/lib/public-product-presentation";
import Hero from "@/components/home/Hero";
import AboutUs from "@/components/home/AboutUs";
import Brands from "@/components/home/Brands";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import CoreSolutions from "@/components/home/CoreSolutions";
import Product3DTeaser from "@/components/home/Product3DTeaser";
import DistributionNetworkTeaser from "@/components/home/DistributionNetworkTeaser";
import CtaBanner from "@/components/home/CtaBanner";
import StoreTeaser from "@/components/home/StoreTeaser";
import HomeCareers from "@/components/home/HomeCareers";
import {
  getHomepageFeaturedProducts,
  getPublicCareerListings,
  listPublicDistributionEntities,
  getWhatsAppContact,
  listPublicBrands,
  listPublicProductsByType,
  resolveHeroSlides,
} from "@/lib/public-data";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const current = await getLocale();
  const locale = isPublicLocale(current) ? current : "id";
  const t = await getTranslations({ locale, namespace: "home.metadata" });
  return publicMetadata("/", locale, { title: t("title"), description: t("description") });
}

export default async function HomePage() {
  const current = await getLocale();
  const locale = isPublicLocale(current) ? current : "id";
  const { common, navigation, home, requests } = await loadMessages(locale);
  const [
    brandItems,
    careerListings,
    featuredProducts,
    publicProducts,
    distributionEntities,
    distributorContact,
    salesContact,
  ] = await Promise.all([
    listPublicBrands(),
    getPublicCareerListings({ page: 1, per_page: 3 }),
    getHomepageFeaturedProducts(),
    listPublicProductsByType(),
    listPublicDistributionEntities(),
    getWhatsAppContact("mika_distributor_inquiry"),
    getWhatsAppContact("mika_product_sales"),
  ]);
  const products3d = publicProducts.filter((product) => product.model_3d_url?.trim());
  const resolved = await resolvePublicB2BProducts([...new Map([...featuredProducts, ...products3d].map(row => [row.id, row])).values()], locale);
  const contentById = new Map(resolved.map(product => [product.canonical.id, product]));
  const featuredViews = featuredProducts.map(row => toB2BHomeView(contentById.get(row.id)!));
  const modelViews = products3d.map(row => toB2BHomeView(contentById.get(row.id)!));
  const heroSlides = resolveHeroSlides(featuredProducts).map(slide => ({
    ...slide,
    ...(!slide.isCompanyFallback && contentById.has(slide.key) ? { productName: contentById.get(slide.key)!.content.name, subtitle: contentById.get(slide.key)!.content.description } : {}),
    ctaLabel: home.hero.viewProduct,
    ...(slide.isCompanyFallback ? { badge: home.hero.companyBadge, subtitle: home.hero.companySubtitle } : {}),
    ...(!slide.isCompanyFallback && !featuredProducts.find(product => product.id === slide.key)?.brand
      ? { badge: home.hero.productBadge } : {}),
  }));
  const hasGroupDistribution = distributionEntities.some(
    (entity) => entity.distributionType === "group_distribution",
  );

  return (
    <NextIntlClientProvider locale={locale} timeZone="Asia/Jakarta" messages={{ common, navigation, home: {
      hero: home.hero, aboutUs: home.aboutUs, brands: home.brands,
      solutions: home.solutions, product3d: home.product3d, cta: home.cta,
    }, requests: { rfq: requests.rfq } }}>
    <main className="flex-grow">
      <Hero slides={heroSlides} />
      <AboutUs />
      <Brands items={brandItems} />
       <FeaturedProducts products={featuredViews} />
      <CoreSolutions />
       {modelViews.length > 0 && <Product3DTeaser products={modelViews} />}
      {hasGroupDistribution && (
        <DistributionNetworkTeaser entities={distributionEntities} number={distributorContact?.number ?? null} />
      )}
      <CtaBanner salesNumber={salesContact?.number ?? null} />
      <StoreTeaser />
      <HomeCareers items={careerListings.response.data} available={careerListings.response.success} />
    </main>
    </NextIntlClientProvider>
  );
}
