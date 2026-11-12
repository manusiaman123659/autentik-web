import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function buttonClass(
  variant: "primary" | "secondary" | "quiet" | "danger" = "primary",
  size: "sm" | "md" = "md"
) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0EA5A0] disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" ? "min-h-9 px-3 py-1.5 text-xs" : "min-h-11 px-4 py-2.5 text-sm",
    {
      primary: "border-transparent bg-[#0B1F3A] text-white hover:bg-[#0E2A4D] dark:bg-[#0EA5A0] dark:text-[#0B1F3A] dark:hover:bg-teal-400",
      secondary: "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
      quiet: "border-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
      danger: "border-transparent bg-red-700 text-white hover:bg-red-800 dark:bg-red-700 dark:hover:bg-red-600",
    }[variant]
  );
}

export function PageHeader({
  title,
  description,
  backHref,
  actionLabel,
  actionHref,
}: {
  title: string;
  description?: string;
  backHref?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div>
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0EA5A0] hover:underline mb-2"
          >
            <ArrowLeft size={15} />
            Kembali
          </Link>
        )}
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors whitespace-nowrap"
        >
          <Plus size={16} />
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

const BADGE_STYLES: Record<string, string> = {
  teal: "bg-[#0EA5A0]/10 text-[#0C8C87] dark:text-teal-300",
  green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
  blue: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  slate: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

export function Badge({
  label,
  tone = "slate",
  className,
  children,
}: {
  label?: ReactNode;
  tone?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap",
        BADGE_STYLES[tone] ?? BADGE_STYLES.slate,
        className
      )}
    >
      {children ?? label}
    </span>
  );
}

export function statusTone(status?: string | null) {
  switch (status) {
    case "completed":
    case "published":
    case "read":
    case "active":
    case "open":
    case "done":
      return "green";
    case "pending":
    case "unpaid":
    case "new":
    case "draft":
      return "amber";
    case "cancelled":
    case "closed":
    case "failed":
      return "red";
    case "shipped":
      return "blue";
    default:
      return "slate";
  }
}

export function EmptyState({
  icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="py-16 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">{description}</p>
      )}
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0EA5A0] text-white text-sm font-semibold hover:bg-[#0C8C87] transition-colors"
        >
          <Plus size={16} />
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function TableShell({ children, tableClassName, scrollLabel, scrollDescriptionId }: {
  children: ReactNode;
  tableClassName?: string;
  scrollLabel?: string;
  scrollDescriptionId?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <div
        className={cn("overflow-x-auto", scrollLabel && "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#0EA5A0]")}
        role={scrollLabel ? "region" : undefined}
        aria-label={scrollLabel}
        aria-describedby={scrollDescriptionId}
        tabIndex={scrollLabel ? 0 : undefined}
      >
        <table className={cn("w-full text-sm", tableClassName)}>{children}</table>
      </div>
    </Card>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800", className)}>{children}</td>;
}

export const inputClass =
  "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0EA5A0]/50 focus:border-[#0EA5A0] transition-colors";

export const labelClass = "block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide";

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-500">{message}</p>;
}

export function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
