export default function Loading() {
  return (
    <>
      {/* Hero skeleton */}
      <section
        className="pt-36 pb-20 public-page-hero [&_.animate-pulse]:max-w-full"
      >
        <div className="max-w-4xl mx-auto px-6 lg:px-16 text-center space-y-6">
          <div className="h-6 w-48 mx-auto rounded-full animate-pulse bg-white/10" />
          <div className="h-10 w-80 mx-auto rounded animate-pulse bg-white/10" />
          <div className="h-4 w-96 mx-auto rounded animate-pulse bg-white/10" />
        </div>
      </section>

      {/* Form + Info skeleton */}
      <section className="py-24 px-6 lg:px-16" style={{ backgroundColor: "var(--bg-secondary)" }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form — 3 cols */}
          <div className="lg:col-span-3 p-8 rounded-2xl border space-y-5" style={{ borderColor: "var(--border-subtle)" }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                <div className="h-10 w-full rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
            <div className="space-y-2">
              <div className="h-4 w-20 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="h-28 w-full rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="h-12 w-40 rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
          </div>

          {/* Info — 2 cols */}
          <div className="lg:col-span-2 space-y-5">
            <div className="p-6 rounded-2xl border space-y-4" style={{ borderColor: "var(--border-subtle)" }}>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                <div className="h-5 w-40 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="h-4 w-full rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-3/4 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="p-6 rounded-2xl border space-y-4" style={{ borderColor: "var(--border-subtle)" }}>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                <div className="h-5 w-32 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="h-10 w-full rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
