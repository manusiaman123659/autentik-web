export function normalizeMoneyAmount(value: unknown): string | null {
  let normalized: string;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    normalized = value.toFixed(2);
  } else if (typeof value === "string") {
    normalized = value.trim();
  } else {
    return null;
  }

  const match = normalized.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const fraction = (match[2] ?? "").padEnd(2, "0");
  return `${BigInt(match[1])}.${fraction}`;
}
