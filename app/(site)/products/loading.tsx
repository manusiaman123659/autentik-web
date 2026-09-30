export default function Loading() {
  return (
    <>
      {/* Hero skeleton */}
      <section
        className="pt-36 pb-20 public-page-hero [&_.animate-pulse]:max-w-full [&_.animate-pulse]:bg-slate-200 dark:[&_.animate-pulse]:bg-white/10"
      >
        <div className="max-w-4xl mx-auto px-6 lg:px-16 text-center space-y-6">
          <div className="h-6 w-48 mx-auto rounded-full animate-pulse bg-white/10" />
          <div className="h-10 w-72 mx-auto rounded animate-pulse bg-white/10" />
          <div className="h-4 w-96 mx-auto rounded animate-pulse bg-white/10" />
        </div>
      </section>

      {/* Category chips skeleton */}
      <section className="py-8 px-6 lg:px-16" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex gap-3 justify-center flex-wrap">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 w-28 rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 flex-1 rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
            <div className="h-10 w-32 rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </section>

      {/* Product grid skeleton */}
      <section className="py-12 px-6 lg:px-16" style={{ backgroundColor: "var(--bg-secondary)" }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-[22px] border overflow-hidden"
                style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-card)" }}
              >
                <div className="h-48 animate-pulse bg-slate-200 dark:bg-slate-800" />
                <div className="p-6 space-y-3">
                  <div className="h-3 w-20 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                  <div className="h-5 w-48 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3 w-full rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3 w-3/4 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                  <div className="pt-3 border-t space-y-1.5" style={{ borderColor: "var(--border-subtle)" }}>
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="flex justify-between">
                        <div className="h-2.5 w-20 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                        <div className="h-2.5 w-24 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-6 pb-6 pt-4 grid grid-cols-2 gap-2 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                  <div className="h-9 rounded-lg animate-pulse bg-slate-200 dark:bg-slate-800" />
                  <div className="h-9 rounded-lg animate-pulse bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
