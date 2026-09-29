import { normalizeMoneyAmount } from "@/lib/payments/money";

export type MidtransInitializationState =
  | "idle"
  | "initializing"
  | "unknown"
  | "ready"
  | "compensated";

export type MidtransUnknownReason =
  | "transport_unknown"
  | "provider_unpersisted"
  | "server_interrupted";

export type MidtransCompensationReason =
  | "local_preflight"
  | "amount_invalid"
  | "provider_rejected";

export class MidtransCreatePreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MidtransCreatePreflightError";
  }
}

export class MidtransCreateResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MidtransCreateResponseError";
  }
}

export type MidtransCreateFailure =
  | { outcome: "definitive"; reason: "local_preflight" }
  | { outcome: "unknown"; reason: MidtransUnknownReason };

export function classifyMidtransCreateFailure(error: unknown): MidtransCreateFailure {
  if (error instanceof MidtransCreatePreflightError) {
    return { outcome: "definitive", reason: "local_preflight" };
  }
  if (error instanceof MidtransCreateResponseError) {
    return { outcome: "unknown", reason: "provider_unpersisted" };
  }
  return { outcome: "unknown", reason: "transport_unknown" };
}

export function parseWholeRupiahAmount(value: unknown): number | null {
  const normalized = normalizeMoneyAmount(value);
  if (normalized === null || !normalized.endsWith(".00")) return null;

  const rupiah = BigInt(normalized.slice(0, -3));
  if (rupiah <= BigInt(0) || rupiah > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(rupiah);
}

export function getExpectedMidtransSnapOrigin(isProduction: boolean): string {
  return isProduction
    ? "https://app.midtrans.com"
    : "https://app.sandbox.midtrans.com";
}

export function getSafeMidtransRedirectUrl(
  value: unknown,
  isProduction: boolean,
): string | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!candidate || candidate.length > 2048) return null;

  try {
    const url = new URL(candidate);
    if (
      url.origin !== getExpectedMidtransSnapOrigin(isProduction)
      || !url.pathname.startsWith("/snap/")
      || url.username
      || url.password
      || url.hash
    ) {
      return null;
    }
    return candidate;
  } catch {
    return null;
  }
}

export function getRpcOutcome(value: unknown): string | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const outcome = (value as { outcome?: unknown }).outcome;
  return typeof outcome === "string" ? outcome : null;
}

export function getClaimId(value: unknown): string | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const claimId = (value as { claim_id?: unknown }).claim_id;
  return typeof claimId === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(claimId)
    ? claimId
    : null;
}
