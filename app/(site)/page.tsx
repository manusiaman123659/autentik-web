import type { Metadata } from "next";
import Hero from "@/components/home/Hero";
import AboutUs from "@/components/home/AboutUs";
import Brands from "@/components/home/Brands";
import WhyChooseUs from "@/components/home/WhyChooseUs";
import HomeCareers from "@/components/home/HomeCareers";

export const metadata: Metadata = {
  title: "Autentik | High-Performance Industrial Technology & Automation",
  description:
    "High-performance industrial technology that integrates intelligence and automation. Smart Air Quality Monitoring System, Water Purification, Auto Dry Cabinets.",
};

export default function HomePage() {
  return (
    <main className="flex-grow">
      <Hero />
      <AboutUs />
      <Brands />
      <WhyChooseUs />
      <HomeCareers />
    </main>
  );
}
