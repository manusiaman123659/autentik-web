"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface WishlistItem {
  id: string;
  slug: string;
  name: string;
  brand: string;
  image_url: string | null;
  price: number | null;
}

const STORAGE_KEY = "autentik-wishlist:v1";
const MAX_ITEMS = 100;

function readStorage(): WishlistItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is WishlistItem =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as WishlistItem).id === "string" &&
        typeof (x as WishlistItem).slug === "string" &&
        typeof (x as WishlistItem).name === "string" &&
        typeof (x as WishlistItem).brand === "string"
    );
  } catch {
    return [];
  }
}

function writeStorage(items: WishlistItem[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Abaikan error kuota localStorage
  }
}

export function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(readStorage());
    setHydrated(true);
  }, []);

  const has = useCallback(
    (productId: string) => items.some((p) => p.id === productId),
    [items]
  );

  const toggle = useCallback((product: WishlistItem) => {
    setItems((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      const next = exists
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, product].slice(0, MAX_ITEMS);
      writeStorage(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    writeStorage([]);
  }, []);

  const value = useMemo(
    () => ({ items, hydrated, has, toggle, clear }),
    [items, hydrated, has, toggle, clear]
  );

  return value;
}
