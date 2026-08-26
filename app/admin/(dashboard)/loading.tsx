export default function Loading() {
  return (
    <div className="space-y-6">
      {/* PageHeader skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg animate-pulse bg-slate-200 dark:bg-slate-800" />
        <div className="h-6 w-48 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
      </div>

      {/* Metrics cards skeleton */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 w-20 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="h-8 w-8 rounded-lg animate-pulse bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="h-7 w-16 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="h-5 w-40 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="h-9 w-9 rounded-lg animate-pulse bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-1/3 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3 w-1/5 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
              <div className="h-6 w-16 rounded-full animate-pulse bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
