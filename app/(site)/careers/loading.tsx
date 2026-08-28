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
          <div className="h-4 w-96 mx-auto rounded animate-pulse bg-white/10" />
          <div className="h-4 w-72 mx-auto rounded animate-pulse bg-white/10" />
        </div>
      </section>

      {/* Mengapa Autentik skeleton */}
      <section className="py-24 px-6 lg:px-16" style={{ backgroundColor: "var(--bg-secondary)" }}>
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <div className="h-8 w-64 mx-auto rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-96 mx-auto rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-8 rounded-2xl border space-y-4" style={{ borderColor: "var(--border-subtle)" }}>
                <div className="w-12 h-12 rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
                <div className="h-6 w-32 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-full rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-5/6 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Posisi Terbuka skeleton */}
      <section className="py-24 px-6 lg:px-16" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <div className="h-8 w-56 mx-auto rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-80 mx-auto rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="flex gap-3 justify-center">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 w-24 rounded-full animate-pulse bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
          <div className="h-12 w-full rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 rounded-2xl border flex items-center gap-4" style={{ borderColor: "var(--border-subtle)" }}>
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-48 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                  <div className="h-3 w-full rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                  <div className="flex gap-3">
                    <div className="h-4 w-24 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 w-20 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
                <div className="h-8 w-16 rounded-full animate-pulse bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
