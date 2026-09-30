import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-base bg-card-base px-5 py-16 text-center shadow-sm sm:py-20">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-page-alt text-teal-600 dark:text-teal-300">
        <Icon size={40} strokeWidth={1.5} aria-hidden="true" />
      </div>
      <h2 className="text-xl font-bold text-heading sm:text-2xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-body sm:text-base">{description}</p>
      {action && <div className="mt-7 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
