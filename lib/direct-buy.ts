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
}

const DIRECT_BUY_STORAGE_KEY = "autentik-direct-buy:v1";

export function setDirectBuyItem(item: DirectBuyItem): void {
  if (typeof window === "undefined") return;
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
      parsed.quantity >= 1
    ) {
      return parsed as DirectBuyItem;
    }
  } catch (err) {
    console.error("[DirectBuy] Failed to parse direct buy item:", err);
  }
  return null;
}

export function clearDirectBuyItem(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(DIRECT_BUY_STORAGE_KEY);
  } catch (err) {
    console.error("[DirectBuy] Failed to clear direct buy item:", err);
  }
}
