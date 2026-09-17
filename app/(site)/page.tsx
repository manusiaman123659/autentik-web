import type { Metadata } from "next";
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
  getHeroSlides,
  getPublicCareerListings,
  listPublicDistributionEntities,
  getWhatsAppContact,
  listPublicBrands,
  listPublicProductsByType,
  type PublicBrandItem,
} from "@/lib/public-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Autentik | Manufaktur Produk Teknologi Industri Indonesia",
  description:
    "PT Autentik Karya Analitika mengembangkan produk dan sistem teknologi untuk kebutuhan industri, laboratorium, pemantauan lingkungan, dan integrasi IoT.",
};

const MAIN_BRANDS = ["Talpha", "Autentik", "Cylab", "Ullun", "Epal"] as const;

function selectMainBrands(items: PublicBrandItem[]): PublicBrandItem[] {
  return MAIN_BRANDS.map((name) => {
    const item = items.find((candidate) => candidate.name.toLowerCase() === name.toLowerCase());
    return item
      ? { ...item, name: name.toUpperCase() }
      : { name: name.toUpperCase(), brandFilter: name, logoSrc: "" };
  });
}

export default async function HomePage() {
  const [brandItems, careerListings, heroSlides, publicProducts, distributionEntities, distributorContact, salesContact] =
    await Promise.all([
      listPublicBrands(),
      getPublicCareerListings({ page: 1, per_page: 3 }),
      getHeroSlides(),
      listPublicProductsByType(),
      listPublicDistributionEntities(),
      getWhatsAppContact("mika_distributor_inquiry"),
      getWhatsAppContact("mika_product_sales"),
    ]);
  const featuredProducts = publicProducts.slice(0, 4);
  const products3d = publicProducts.filter((product) => product.model_3d_url?.trim());
  const hasGroupDistribution = distributionEntities.some(
    (entity) => entity.distributionType === "group_distribution",
  );

  return (
    <main className="flex-grow">
      <Hero slides={heroSlides} />
      <AboutUs />
      <Brands items={selectMainBrands(brandItems)} />
      <FeaturedProducts products={featuredProducts} />
      <CoreSolutions />
      {products3d.length > 0 && <Product3DTeaser products={products3d} />}
      {hasGroupDistribution && (
        <DistributionNetworkTeaser entities={distributionEntities} number={distributorContact?.number ?? null} />
      )}
      <CtaBanner salesNumber={salesContact?.number ?? null} />
      <StoreTeaser />
      <HomeCareers items={careerListings.response.data} />
    </main>
  );
}
