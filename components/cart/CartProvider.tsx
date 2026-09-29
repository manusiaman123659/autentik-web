"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

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
        x.quantity >= 1
      ) {
        const variantId = typeof x.variant_id === "string" && x.variant_id ? x.variant_id : null;
        const key = typeof x.key === "string" && x.key.includes("::") ? x.key : getCartItemKey(x.id, variantId);
        const existing = map.get(key);
        if (existing) {
          existing.quantity = Math.min(existing.stock, existing.quantity + x.quantity);
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
      if (stock < 1 || product.price == null) return prev;
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
      };
      const qty = Math.max(1, Math.min(stock, quantity));

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
          quantity: Math.min(item.stock, existing.quantity + qty),
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
        return matches
          ? { ...i, quantity: Math.max(1, Math.min(i.stock, quantity)) }
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
    }),
    [items, hydrated, totalItems, subtotal, addItem, removeItem, updateQty, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
