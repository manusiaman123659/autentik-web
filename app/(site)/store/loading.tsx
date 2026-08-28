export default function Loading() {
  return (
    <>
      {/* Hero skeleton */}
      <section
        className="pt-36 pb-20"
        style={{
          background: "linear-gradient(135deg, #050d1a 0%, #0B1F3A 50%, #0e2a4d 100%)",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 lg:px-16 text-center space-y-6">
          <div className="h-6 w-48 mx-auto rounded-full animate-pulse bg-white/10" />
          <div className="h-10 w-64 mx-auto rounded animate-pulse bg-white/10" />
          <div className="h-4 w-80 mx-auto rounded animate-pulse bg-white/10" />
        </div>
      </section>

      {/* Filter + Search skeleton */}
      <section className="py-8 px-6 lg:px-16" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="h-10 flex-1 rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
          <div className="h-10 w-32 rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
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
                <div className="h-52 animate-pulse bg-slate-200 dark:bg-slate-800" />
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-16 rounded-full animate-pulse bg-slate-200 dark:bg-slate-800" />
                    <div className="h-5 w-20 rounded-full animate-pulse bg-slate-200 dark:bg-slate-800" />
                  </div>
                  <div className="h-5 w-40 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                  <div className="h-4 w-56 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                  <div className="h-7 w-28 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="px-5 pb-5 flex gap-2">
                  <div className="h-10 flex-1 rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
                  <div className="h-10 flex-1 rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
