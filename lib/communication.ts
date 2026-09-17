export type CommunicationIntent =
  | "aka_component_inquiry"
  | "aka_commerce_support"
  | "aka_order_support"
  | "mika_sparepart_sales"
  | "mika_custom_request"
  | "mika_product_sales"
  | "mika_distributor_inquiry"
  | "mika_rfq_followup";

export interface WhatsAppContact {
  label: string;
  number: string;
}

export interface ParsedWhatsAppContacts {
  ppicAka: WhatsAppContact | null;
  mikaSales: WhatsAppContact | null;
  legacy: WhatsAppContact | null;
}

export interface ResolvedWhatsAppContacts {
  ppicAka: WhatsAppContact | null;
  mikaSales: WhatsAppContact | null;
}

function normalizeWhatsAppNumber(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  const normalized = digits.startsWith("620")
    ? `62${digits.slice(3)}`
    : digits.startsWith("0")
      ? `62${digits.slice(1)}`
      : digits;
  return normalized.length >= 10 && normalized.length <= 15 ? normalized : null;
}

function parseContact(value: unknown, fallbackLabel: string): WhatsAppContact | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as { label?: unknown; number?: unknown };
  const number = normalizeWhatsAppNumber(raw.number);
  if (!number) return null;
  const label = typeof raw.label === "string" && raw.label.trim() ? raw.label.trim() : fallbackLabel;
  return { label, number };
}

export function parseWhatsAppContacts(value: unknown): ParsedWhatsAppContacts {
  if (!value || typeof value !== "object") {
    return { ppicAka: null, mikaSales: null, legacy: null };
  }

  const raw = value as {
    ppicAka?: unknown;
    mikaSales?: unknown;
    number?: unknown;
  };
  const legacyNumber = normalizeWhatsAppNumber(raw.number);

  return {
    ppicAka: parseContact(raw.ppicAka, "PPIC AKA"),
    mikaSales: parseContact(raw.mikaSales, "Admin MIKA"),
    legacy: legacyNumber ? { label: "WhatsApp", number: legacyNumber } : null,
  };
}

export function resolveWhatsAppContact(
  contacts: ParsedWhatsAppContacts,
  intent: CommunicationIntent,
): WhatsAppContact | null {
  const isAkaIntent =
    intent === "aka_component_inquiry" ||
    intent === "aka_commerce_support" ||
    intent === "aka_order_support";

  return (isAkaIntent ? contacts.ppicAka : contacts.mikaSales) ?? contacts.legacy;
}

export function resolveWhatsAppContacts(value: unknown): ResolvedWhatsAppContacts {
  const contacts = parseWhatsAppContacts(value);
  return {
    ppicAka: resolveWhatsAppContact(contacts, "aka_component_inquiry"),
    mikaSales: resolveWhatsAppContact(contacts, "mika_product_sales"),
  };
}
