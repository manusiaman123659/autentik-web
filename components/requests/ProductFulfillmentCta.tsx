import Link from "next/link";
import { PackageSearch, Headset } from "lucide-react";

interface FulfillmentCtaProps {
  fulfillmentType?: string | null;
  name: string;
  slug: string;
  variant?: "detail" | "card";
}

const SUPPORT_WA = "6281234567890";

export default function ProductFulfillmentCta({
  fulfillmentType,
  name,
  slug,
  variant = "detail",
}: FulfillmentCtaProps) {
  if (fulfillmentType === "ready_stock") return null;

  const isCustom = fulfillmentType === "custom_request";

  const href = isCustom
    ? `/custom-request?product=${encodeURIComponent(slug)}`
    : `https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent(
        `Halo, saya butuh bantuan technical support untuk produk ${name}. Mohon bantuannya untuk pengadaan dan dukungan teknis.`
      )}`;

  const Icon = isCustom ? PackageSearch : Headset;
  const label = isCustom ? "Ajukan Kebutuhan Custom" : "Hubungi Technical Support";

  if (variant === "card") {
    return (
      <Link
        href={href}
        target={isCustom ? undefined : "_blank"}
        rel={isCustom ? undefined : "noopener noreferrer"}
        className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-xs font-bold text-white transition-all shadow-md hover:opacity-90"
        style={{ backgroundColor: isCustom ? "#0EA5A0" : "#25D366" }}
      >
        <Icon size={15} className="flex-shrink-0" />
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      target={isCustom ? undefined : "_blank"}
      rel={isCustom ? undefined : "noopener noreferrer"}
      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-semibold text-white transition-all hover:opacity-90 hover:shadow-md"
      style={{ backgroundColor: isCustom ? "#0EA5A0" : "#25D366" }}
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}
