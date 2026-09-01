"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface RecentProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  image_url: string | null;
  price: number | null;
}

const STORAGE_KEY = "autentik-recently-viewed:v1";
const MAX_ITEMS = 8;

function readStorage(): RecentProduct[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is RecentProduct =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as RecentProduct).id === "string" &&
        typeof (x as RecentProduct).slug === "string" &&
        typeof (x as RecentProduct).name === "string" &&
        typeof (x as RecentProduct).brand === "string"
    );
  } catch {
    return [];
  }
}

function writeStorage(items: RecentProduct[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Abaikan error kuota localStorage
  }
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentProduct[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(readStorage());
    setHydrated(true);
  }, []);

  const add = useCallback((product: RecentProduct) => {
    setItems((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id);
      const next = [product, ...filtered].slice(0, MAX_ITEMS);
      writeStorage(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    writeStorage([]);
  }, []);

  const value = useMemo(
    () => ({ items, hydrated, add, clear }),
    [items, hydrated, add, clear]
  );

  return value;
}
