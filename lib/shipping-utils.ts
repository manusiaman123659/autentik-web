export interface RateGap {
  fromG: number;
  toG: number;
}

/**
 * Diagnostic utility to detect uncovered weight ranges (gaps) among active rate bands.
 * Does not dictate authoritative checkout calculations (which are enforced in SQL).
 */
export function detectRateGaps(
  rates: Array<{ weight_from_g: number; weight_to_g: number; is_active?: boolean }>
): RateGap[] {
  const activeRates = rates
    .filter((r) => r.is_active !== false)
    .sort((a, b) => a.weight_from_g - b.weight_from_g);

  if (activeRates.length === 0) return [];

  const gaps: RateGap[] = [];

  // Check initial gap from 0
  if (activeRates[0].weight_from_g > 0) {
    gaps.push({ fromG: 0, toG: activeRates[0].weight_from_g - 1 });
  }

  // Check inter-band gaps
  for (let i = 0; i < activeRates.length - 1; i++) {
    const current = activeRates[i];
    const next = activeRates[i + 1];
    if (next.weight_from_g > current.weight_to_g + 1) {
      gaps.push({ fromG: current.weight_to_g + 1, toG: next.weight_from_g - 1 });
    }
  }

  return gaps;
}

export function formatGrams(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n) + " g";
}
