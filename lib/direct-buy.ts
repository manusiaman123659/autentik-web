import { needsPurchaseReview } from "@/lib/product-attributes";

export interface DirectBuyItem {
  key: string;
  id: string; // product_id
  variant_id: string | null;
  variant_label: string | null;
  slug: string;
  name: string;
  brand: string;
  image_url: string | null;
  price: number;
  stock: number;
  quantity: number;
  min_purchase_qty?: number;
  unit?: string | null;
  purchase_unavailable?: boolean;
}

const DIRECT_BUY_STORAGE_KEY = "autentik-direct-buy:v1";

export function setDirectBuyItem(item: DirectBuyItem): void {
  if (typeof window === "undefined") return;
  if (needsPurchaseReview(item)) return;
  try {
    window.sessionStorage.setItem(DIRECT_BUY_STORAGE_KEY, JSON.stringify(item));
  } catch (err) {
    console.error("[DirectBuy] Failed to save direct buy item:", err);
  }
}

export function getDirectBuyItem(): DirectBuyItem | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DIRECT_BUY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.id === "string" &&
      typeof parsed.quantity === "number" &&
      Number.isInteger(parsed.quantity) && parsed.quantity >= 1 && parsed.quantity <= 999 &&
      typeof parsed.stock === "number" && Number.isInteger(parsed.stock) && parsed.stock >= 0 &&
      typeof parsed.price === "number" && Number.isFinite(parsed.price) && parsed.price >= 0 &&
      typeof parsed.slug === "string" && typeof parsed.name === "string" && typeof parsed.brand === "string"
    ) {
      return parsed as DirectBuyItem;
    }
  } catch (err) {
    console.error("[DirectBuy] Failed to parse direct buy item:", err);
  }
  return null;
}

export function clearDirectBuyItem(): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.removeItem(DIRECT_BUY_STORAGE_KEY);
    return true;
  } catch (err) {
    console.error("[DirectBuy] Failed to clear direct buy item:", err);
    return false;
  }
}
