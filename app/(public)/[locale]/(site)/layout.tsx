import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CartProvider from "@/components/cart/CartProvider";
import FaqWidget from "@/components/chatbot/FaqWidget";

export default function PublicSiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CartProvider>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <FaqWidget />
    </CartProvider>
  );
}
