export default function Loading() {
  return (
    <section
      className="py-12"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left — Media skeleton */}
          <div className="space-y-4">
            <div className="w-full aspect-square rounded-2xl animate-pulse bg-slate-200 dark:bg-slate-800" />
            <div className="flex gap-2">
              <div className="h-16 w-16 rounded-lg animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="h-16 w-16 rounded-lg animate-pulse bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>

          {/* Right — Details skeleton */}
          <div className="space-y-5">
            <div className="h-4 w-24 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-20 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
            <div className="h-10 w-3/4 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-3">
              <div className="h-6 w-16 rounded-full animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-5/6 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-2/3 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-3 w-28 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-32 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-24 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="flex gap-3 pt-4">
              <div className="h-12 w-40 rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="h-12 w-12 rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="h-12 w-12 rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
