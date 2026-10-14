export interface ProductAttributes {
  min_purchase_qty?: number;
  unit?: string | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  dimension_unit?: "mm" | "cm" | "m" | null;
  dimensions_note?: string | null;
  weight_grams?: number | null;
}

export function toProductAttributes(row: ProductAttributes): ProductAttributes {
  return {
    min_purchase_qty: row.min_purchase_qty ?? 1, unit: row.unit ?? null,
    length: row.length ?? null, width: row.width ?? null, height: row.height ?? null,
    dimension_unit: row.dimension_unit ?? null, dimensions_note: row.dimensions_note ?? null,
    weight_grams: row.weight_grams ?? null,
  };
}

export function minimumPurchase(value: number | undefined): number {
  return value === undefined ? 1 : value;
}

// Only explicit customer quantity actions use this; snapshot refresh never changes quantities.
export function purchaseQuantity(requested: number, stock: number, minimum: number): number | null {
  if (!Number.isInteger(requested) || !Number.isInteger(stock) || !Number.isInteger(minimum)
    || minimum < 1 || minimum > 999 || stock < minimum) return null;
  return Math.max(minimum, Math.min(stock, 999, requested));
}

export interface PurchaseLine {
  id: string; variant_id: string | null; quantity: number; stock: number;
  min_purchase_qty?: number; unit?: string | null; purchase_unavailable?: boolean;
}
export interface PurchaseRuleRow {
  id: string; min_purchase_qty: number; unit: string | null; stock: number | null;
  product_variants: { id: string; stock: number; is_active: boolean; deleted_at: string | null }[];
}

export function refreshPurchaseRules<T extends PurchaseLine>(items: T[], rows: PurchaseRuleRow[]): T[] {
  const byId = new Map(rows.map(row => [row.id, row]));
  return items.map(item => {
    const row = byId.get(item.id);
    if (!row) return { ...item, purchase_unavailable: true };
    const variants = row.product_variants.filter(v => v.is_active && v.deleted_at === null);
    const selected = variants.find(v => v.id === item.variant_id);
    return { ...item, min_purchase_qty: row.min_purchase_qty, unit: row.unit,
      stock: item.variant_id ? selected?.stock ?? 0 : row.stock ?? 0,
      purchase_unavailable: item.variant_id ? !selected : variants.length > 0 };
  });
}

export function needsPurchaseReview(item: PurchaseLine): boolean {
  const minimum = minimumPurchase(item.min_purchase_qty);
  return item.purchase_unavailable === true || !Number.isInteger(item.quantity)
    || !Number.isInteger(item.stock) || item.stock < minimum
    || !Number.isInteger(minimum) || minimum < 1 || minimum > 999
    || item.quantity < minimum || item.quantity > Math.min(item.stock, 999);
}
