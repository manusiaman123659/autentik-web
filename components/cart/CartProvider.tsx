"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/utils/supabase/client";
import { minimumPurchase, purchaseQuantity, refreshPurchaseRules, type PurchaseRuleRow } from "@/lib/product-attributes";

export interface CartItem {
  key: string;
  id: string;
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

export function getCartItemKey(productId: string, variantId?: string | null): string {
  return `${productId}::${variantId ?? "default"}`;
}

export interface CartItemInput {
  id: string;
  variant_id?: string | null;
  variant_label?: string | null;
  slug: string;
  name: string;
  brand: string;
  image_url?: string | null;
  price?: number | null;
  stock?: number | null;
  fulfillmentType?: "ready_stock" | "custom_request" | "third_party" | null;
  min_purchase_qty?: number;
  unit?: string | null;
  has_active_variants?: boolean;
}

interface CartContextValue {
  items: CartItem[];
  hydrated: boolean;
  totalItems: number;
  subtotal: number;
  addItem: (product: CartItemInput, quantity?: number) => void;
  removeItem: (keyOrId: string, variantId?: string | null) => void;
  updateQty: (keyOrId: string, quantity: number, variantId?: string | null) => void;
  clearCart: () => boolean;
  rulesLoading: boolean;
  rulesError: boolean;
}

const STORAGE_KEY = "autentik-cart:v1";

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const map = new Map<string, CartItem>();
    for (const x of parsed) {
      if (
        typeof x === "object" &&
        x !== null &&
        typeof x.id === "string" &&
        typeof x.slug === "string" &&
        typeof x.name === "string" &&
        typeof x.brand === "string" &&
        typeof x.price === "number" &&
        typeof x.stock === "number" &&
        typeof x.quantity === "number" &&
        Number.isInteger(x.quantity) && x.quantity >= 1 && Number.isFinite(x.price) && Number.isInteger(x.stock) && x.stock >= 0
      ) {
        const variantId = typeof x.variant_id === "string" && x.variant_id ? x.variant_id : null;
        const key = typeof x.key === "string" && x.key.includes("::") ? x.key : getCartItemKey(x.id, variantId);
        const existing = map.get(key);
        if (existing) {
          existing.quantity += x.quantity;
        } else {
          map.set(key, {
            key,
            id: x.id,
            variant_id: variantId,
            variant_label: typeof x.variant_label === "string" ? x.variant_label : null,
            slug: x.slug,
            name: x.name,
            brand: x.brand,
            image_url: x.image_url ?? null,
            price: x.price,
            stock: x.stock,
            quantity: x.quantity,
            min_purchase_qty: typeof x.min_purchase_qty === "number" ? x.min_purchase_qty : undefined,
            unit: typeof x.unit === "string" ? x.unit : null,
          });
        }
      }
    }
    return Array.from(map.values());
  } catch {
    return [];
  }
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}

export default function CartProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesError, setRulesError] = useState(false);
  const ruleIds = JSON.stringify([...new Set(items.map(item => item.id))].sort());

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    let generation = 0;
    const refresh = async () => {
      const currentGeneration = ++generation;
      setRulesLoading(true);
      try {
        const ids: string[] = JSON.parse(ruleIds);
        const rows: PurchaseRuleRow[] = [];
        const supabase = createClient();
        for (let start = 0; start < ids.length; start += 100) {
          const { data, error } = await supabase.from("products")
            .select("id,min_purchase_qty,unit,stock,product_variants(id,stock,is_active,deleted_at)")
            .in("id", ids.slice(start, start + 100)).eq("product_type", "sparepart")
            .eq("status", "published").eq("is_active", true).eq("is_store_visible", true)
            .eq("fulfillment_type", "ready_stock").is("deleted_at", null);
          if (error) throw error;
          rows.push(...(data ?? []) as PurchaseRuleRow[]);
        }
        if (cancelled || currentGeneration !== generation) return;
        setItems(previous => refreshPurchaseRules(previous, rows));
        setRulesError(false);
      } catch {
        if (!cancelled && currentGeneration === generation) setRulesError(true);
      } finally {
        if (!cancelled && currentGeneration === generation) setRulesLoading(false);
      }
    };
    void refresh();
    window.addEventListener("focus", refresh);
    return () => { cancelled = true; window.removeEventListener("focus", refresh); };
  }, [hydrated, ruleIds]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(readStorage());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Abaikan error kuota/quota localStorage; cart tetap berfungsi di sesi ini.
    }
  }, [items, hydrated]);

  const addItem = useCallback((product: CartItemInput, quantity = 1) => {
    setItems((prev) => {
      const stock = Math.max(0, product.stock ?? 0);
      const minimum = minimumPurchase(product.min_purchase_qty);
      const qty = purchaseQuantity(quantity, stock, minimum);
      if (qty === null || product.price == null || !Number.isFinite(product.price)
        || (product.fulfillmentType ?? "ready_stock") !== "ready_stock"
        || (product.has_active_variants && !product.variant_id)) return prev;
      const variantId = product.variant_id ?? null;
      const variantLabel = product.variant_label ?? null;
      const key = getCartItemKey(product.id, variantId);

      const item: CartItem = {
        key,
        id: product.id,
        variant_id: variantId,
        variant_label: variantLabel,
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        image_url: product.image_url ?? null,
        price: product.price,
        stock,
        quantity: 1,
        min_purchase_qty: minimum,
        unit: product.unit ?? null,
      };

      // If a valid variant is selected, clean up any conflicting legacy unselected (null) variant of the same product
      let baseList = prev;
      if (variantId !== null) {
        baseList = prev.filter((i) => !(i.id === product.id && i.variant_id === null));
      }

      const existingIndex = baseList.findIndex((i) => i.key === key);
      if (existingIndex >= 0) {
        const existing = baseList[existingIndex];
        const nextList = [...baseList];
        nextList[existingIndex] = {
          ...existing,
          price: item.price,
          stock: item.stock,
          min_purchase_qty: minimum,
          unit: item.unit,
          purchase_unavailable: false,
          quantity: Math.min(item.stock, 999, existing.quantity + qty),
        };
        return nextList;
      }
      return [...baseList, { ...item, quantity: qty }];
    });
  }, []);

  const removeItem = useCallback((keyOrId: string, variantId?: string | null) => {
    setItems((prev) =>
      prev.filter((i) => {
        if (keyOrId.includes("::")) {
          return i.key !== keyOrId;
        }
        return !(i.id === keyOrId && i.variant_id === (variantId ?? null));
      })
    );
  }, []);

  const updateQty = useCallback((keyOrId: string, quantity: number, variantId?: string | null) => {
    setItems((prev) =>
      prev.map((i) => {
        const matches = keyOrId.includes("::")
          ? i.key === keyOrId
          : i.id === keyOrId && i.variant_id === (variantId ?? null);
        const next = purchaseQuantity(quantity, i.stock, minimumPurchase(i.min_purchase_qty));
        return matches && next !== null && !i.purchase_unavailable
          ? { ...i, quantity: next }
          : i;
      })
    );
  }, []);

  const clearCart = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "[]");
      setItems([]);
      return true;
    } catch {
      return false;
    }
  }, []);

  const totalItems = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      hydrated,
      totalItems,
      subtotal,
      addItem,
      removeItem,
      updateQty,
      clearCart,
      rulesLoading,
      rulesError,
    }),
    [items, hydrated, totalItems, subtotal, addItem, removeItem, updateQty, clearCart, rulesLoading, rulesError]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
