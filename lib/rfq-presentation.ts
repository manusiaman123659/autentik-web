export const RFQ_PRESENTATION_FIELDS = [
  "productId", "productName", "companyName", "picName", "email", "phoneNumber", "estimatedQuantity", "targetDate", "notes",
] as const;
export type RfqPresentationField = (typeof RFQ_PRESENTATION_FIELDS)[number];
export type RfqFieldErrors = Partial<Record<RfqPresentationField, string[]>>;
export type RfqErrorCategory = "INVALID_REQUEST" | "RATE_LIMITED" | "SERVICE_UNAVAILABLE" | "UNKNOWN" | "NETWORK";

export function getRfqErrorCategory(status: number): RfqErrorCategory {
  if (status === 400 || status === 413) return "INVALID_REQUEST";
  if (status === 429) return "RATE_LIMITED";
  if (status === 503) return "SERVICE_UNAVAILABLE";
  return "UNKNOWN";
}

export function normalizeRfqFieldErrors(value: unknown): RfqFieldErrors {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const result: RfqFieldErrors = {};
  for (const field of RFQ_PRESENTATION_FIELDS) {
    const items = typeof source[field] === "string" ? [source[field]] : source[field];
    if (!Array.isArray(items)) continue;
    const messages = items.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    if (messages.length) result[field] = messages;
  }
  return result;
}
