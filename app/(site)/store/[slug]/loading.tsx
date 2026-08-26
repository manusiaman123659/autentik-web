export default function Loading() {
  return (
    <section
      className="py-12"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left — Image skeleton */}
          <div className="space-y-4">
            <div className="w-full aspect-square rounded-2xl animate-pulse bg-slate-200 dark:bg-slate-800 relative">
              <div className="absolute top-4 left-4 h-6 w-16 rounded-full animate-pulse bg-slate-300 dark:bg-slate-700" />
              <div className="absolute top-4 right-4 h-6 w-20 rounded-full animate-pulse bg-slate-300 dark:bg-slate-700" />
            </div>
          </div>

          {/* Right — Details skeleton */}
          <div className="space-y-5">
            <div className="h-4 w-20 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-24 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
            <div className="h-10 w-3/4 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
            <div className="h-8 w-32 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-5/6 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="h-16 rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="h-16 rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="h-16 rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="h-16 rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="flex gap-3 pt-4">
              <div className="h-12 flex-1 rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="h-12 w-12 rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="space-y-2 pt-2">
              <div className="flex justify-between">
                <div className="h-4 w-20 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-24 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="flex justify-between">
                <div className="h-4 w-16 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-20 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="h-5 w-12 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                <div className="h-5 w-28 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
