export function isSafeCourier(value: string): boolean {
  return value.length <= 80 && !/[\u0000-\u001f\u007f-\u009f<>]/.test(value)
    && !/(?:[a-z][a-z0-9+.-]*:|www\.|\/\/|&(?:lt|gt);)/i.test(value);
}

export function isSafeTrackingNumber(value: string): boolean {
  return value.length <= 100 && /^[A-Za-z0-9 ._/-]*$/.test(value)
    && !/(?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|id|co|io)(?:[./]|$))/i.test(value);
}

const TRUSTED_TRACKING_HOSTS = new Set(["jne.co.id"]);
const LEGACY_JNE_TRACKING_URL = "https://jne.co.id/tracking-package";

export function normalizeCourierKey(courier: string): string {
  return courier.trim().toLowerCase();
}

export function getSafeTrackingUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048
    || /[\u0000-\u001f\u007f-\u009f?#]/.test(value)) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port
      || !TRUSTED_TRACKING_HOSTS.has(url.hostname) || url.search || url.hash) return null;
    const path = decodeURIComponent(url.pathname);
    if (/[\u0000-\u001f\u007f-\u009f{}<>\[\]:]/.test(path)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function getTrackingDestination(courier: string | null, mapping?: unknown): string | null {
  if (!courier) return null;
  const key = normalizeCourierKey(courier);
  if (mapping != null) {
    if (typeof mapping !== "object" || Array.isArray(mapping)) return null;
    const matches = Object.entries(mapping).filter(([name]) => normalizeCourierKey(name) === key);
    if (matches.length > 1) return null;
    if (matches.length === 1) return getSafeTrackingUrl(matches[0][1]);
  }
  return key === "jne" ? LEGACY_JNE_TRACKING_URL : null;
}
