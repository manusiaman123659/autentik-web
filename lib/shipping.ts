export const SHIPPING_UNAVAILABLE_MESSAGE =
  "Ongkir untuk alamat atau pesanan ini perlu dikonfirmasi.";

export type ShippingQuoteStatus =
  | "QUOTED"
  | "SHIPPING_UNAVAILABLE"
  | "INVALID_WEIGHT"
  | "CONFIGURATION_ERROR";

export interface ShippingQuote {
  status: ShippingQuoteStatus;
  cost: number | null;
  totalWeightG: number | null;
  zoneId: string | null;
  rateId: string | null;
  message: string | null;
}

export function parseShippingQuote(value: unknown): ShippingQuote | null {
  if (!value || typeof value !== "object") return null;
  const quote = value as Record<string, unknown>;
  if (
    quote.status !== "QUOTED" &&
    quote.status !== "SHIPPING_UNAVAILABLE" &&
    quote.status !== "INVALID_WEIGHT" &&
    quote.status !== "CONFIGURATION_ERROR"
  ) {
    return null;
  }

  const cost = typeof quote.cost === "number" ? quote.cost : null;
  const totalWeightG = typeof quote.totalWeightG === "number" ? quote.totalWeightG : null;
  const zoneId = typeof quote.zoneId === "string" ? quote.zoneId : null;
  const rateId = typeof quote.rateId === "string" ? quote.rateId : null;

  if (quote.status === "QUOTED" && (cost == null || cost <= 0 || !zoneId || !rateId)) {
    return null;
  }

  return {
    status: quote.status,
    cost,
    totalWeightG,
    zoneId,
    rateId,
    message: typeof quote.message === "string" ? quote.message : null,
  };
}
