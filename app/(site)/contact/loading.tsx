export default function Loading() {
  return (
    <>
      {/* Header skeleton */}
      <section className="py-24 px-6 lg:px-16" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="h-10 w-80 mx-auto rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-96 mx-auto rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-72 mx-auto rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
        </div>
      </section>

      {/* Form + Info skeleton */}
      <section className="py-24 px-6 lg:px-16" style={{ backgroundColor: "var(--bg-secondary)" }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form — 3 cols */}
          <div className="lg:col-span-3 p-8 rounded-2xl border space-y-5" style={{ borderColor: "var(--border-subtle)" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                <div className="h-10 w-full rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
            <div className="space-y-2">
              <div className="h-4 w-20 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="h-24 w-full rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="h-12 w-40 rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
          </div>

          {/* Info — 2 cols */}
          <div className="lg:col-span-2 space-y-5">
            {[1, 2].map((i) => (
              <div key={i} className="p-6 rounded-2xl border space-y-4" style={{ borderColor: "var(--border-subtle)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                  <div className="h-5 w-32 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="h-4 w-full rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-3/4 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Map + CTA skeleton */}
      <section className="py-24 px-6 lg:px-16" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <div className="h-8 w-64 mx-auto rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-80 mx-auto rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="w-full h-96 rounded-2xl animate-pulse bg-slate-200 dark:bg-slate-800" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 w-full rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
