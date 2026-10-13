import Link from "@/i18n/navigation";
import { PackageSearch, Headset } from "lucide-react";

interface FulfillmentCtaProps {
  fulfillmentType?: string | null;
  name: string;
  slug: string;
  waNumber?: string | null;
  variant?: "detail" | "card";
}

export default function ProductFulfillmentCta({
  fulfillmentType,
  name,
  slug,
  waNumber,
  variant = "detail",
}: FulfillmentCtaProps) {
  if (fulfillmentType === "ready_stock") return null;

  const isCustom = fulfillmentType === "custom_request";

  const href = isCustom
      ? `/custom-request?product=${encodeURIComponent(slug)}`
      : waNumber
      ? `https://wa.me/${waNumber}?text=${encodeURIComponent(
          `Halo Admin MIKA, saya membutuhkan bantuan terkait sparepart atau pengadaan produk ${name}.`
        )}`
      : "/contact";

  const Icon = isCustom ? PackageSearch : Headset;
  const label = isCustom ? "Ajukan Kebutuhan Custom" : "Hubungi Admin MIKA";

  if (variant === "card") {
    return (
      <Link
        href={href}
        target={isCustom ? undefined : "_blank"}
        rel={isCustom ? undefined : "noopener noreferrer"}
        className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-sm text-xs font-semibold text-white transition-colors hover:opacity-90"
        style={{ backgroundColor: isCustom ? "#0EA5A0" : "#25D366" }}
      >
        <Icon size={13} className="flex-shrink-0" />
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
