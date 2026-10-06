export function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export interface CompactSalary {
  min: number | null;
  max: number | null;
  currency?: string | null;
}

const JUTA = 1_000_000;

function formatJuta(value: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(
    value / JUTA,
  );
}

export function formatSalaryCompact(salary: CompactSalary): string | null {
  const currency = salary.currency?.trim().toUpperCase();
  if (currency && currency !== "IDR") return null;

  const { min, max } = salary;

  if (min != null && max != null) {
    if (min > max || min < JUTA || max < JUTA) return null;
    if (min === max) return `Rp ${formatJuta(min)} juta`;
    return `Rp ${formatJuta(min)}–${formatJuta(max)} juta`;
  }

  if (min != null) {
    if (min < JUTA) return null;
    return `Mulai Rp ${formatJuta(min)} juta`;
  }

  if (max != null) {
    if (max < JUTA) return null;
    return `Hingga Rp ${formatJuta(max)} juta`;
  }

  return null;
}
