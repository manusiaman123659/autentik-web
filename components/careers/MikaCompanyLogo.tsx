"use client";

import { useState, useCallback } from "react";

/**
 * Validate an external MIKA Career company logo URL.
 *
 * Accepted: valid absolute HTTPS URL (any hostname).
 * Also accepted in dev only: HTTP on localhost/127.0.0.1/::1.
 *
 * Rejected: HTTP (in production), javascript:, data:, blob:,
 * relative paths, malformed values, URLs with credentials.
 */
function getSafeLogoUrl(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  // Reject dangerous schemes
  if (
    parsed.protocol === "javascript:" ||
    parsed.protocol === "data:" ||
    parsed.protocol === "blob:"
  ) {
    return null;
  }

  // Reject embedded credentials
  if (parsed.username || parsed.password) return null;

  // Accept HTTPS unconditionally
  if (parsed.protocol === "https:") return parsed.toString();

  // In development, accept HTTP for localhost only
  if (
    parsed.protocol === "http:" &&
    typeof window !== "undefined"
      ? false // Client-side: always require HTTPS for external logos
      : process.env.NODE_ENV !== "production"
  ) {
    const host = parsed.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      return parsed.toString();
    }
  }

  return null;
}

interface MikaCompanyLogoProps {
  /** The raw logo URL from the MIKA Career API response. */
  logo: string | null | undefined;
  /** Company name, used for alt text and initials fallback. */
  companyName: string;
  /** Pixel size for width and height. */
  size: number;
  /** Additional CSS class applied to the <img> element. */
  className?: string;
}

/**
 * Renders a MIKA Career external company logo using browser-native <img>
 * (not next/image) so it does not require remotePatterns configuration.
 *
 * Falls back to a company-initial letter when:
 * - logo URL is null/empty
 * - logo URL is invalid or uses a rejected scheme
 * - the image fails to load at runtime (404, 500, unreachable, etc.)
 */
export default function MikaCompanyLogo({
  logo,
  companyName,
  size,
  className = "",
}: MikaCompanyLogoProps) {
  const safeUrl = getSafeLogoUrl(logo);
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  const showFallback = !safeUrl || hasError;

  if (showFallback) {
    return (
      <span
        className="font-bold uppercase"
        style={{
          color: "#0EA5A0",
          fontSize: Math.max(size * 0.35, 12),
          lineHeight: 1,
        }}
      >
        {(companyName?.trim() || "?").charAt(0)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={safeUrl}
      alt={companyName}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={handleError}
      className={className}
    />
  );
}
