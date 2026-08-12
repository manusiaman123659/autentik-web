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
  id: string;
  slug: string;
  name: string;
  brand: string;
  image_url: string | null;
  price: number;
  stock: number;
  quantity: number;
}

export interface CartItemInput {
  id: string;
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
  removeItem: (id: string) => void;
  updateQty: (id: string, quantity: number) => void;
  clearCart: () => void;
}

const STORAGE_KEY = "autentik-cart:v1";

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is CartItem =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as CartItem).id === "string" &&
        typeof (x as CartItem).slug === "string" &&
        typeof (x as CartItem).name === "string" &&
        typeof (x as CartItem).brand === "string" &&
        typeof (x as CartItem).price === "number" &&
        typeof (x as CartItem).stock === "number" &&
        typeof (x as CartItem).quantity === "number" &&
        (x as CartItem).quantity >= 1
    );
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
      const item: CartItem = {
        id: product.id,
        slug: product.slug,
        name: product.name,
        brand: product.brand,
        image_url: product.image_url ?? null,
        price: product.price,
        stock,
        quantity: 1,
      };
      const qty = Math.max(1, Math.min(stock, quantity));
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                price: item.price,
                stock: item.stock,
                quantity: Math.min(item.stock, i.quantity + qty),
              }
            : i
        );
      }
      return [...prev, { ...item, quantity: qty }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQty = useCallback((id: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, quantity: Math.max(1, Math.min(i.stock, quantity)) }
          : i
      )
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

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
