export default function Loading() {
  return (
    <>
      {/* Hero skeleton */}
      <section
        className="pt-36 pb-24"
        style={{
          background: "linear-gradient(135deg, #050d1a 0%, #0B1F3A 50%, #0e2a4d 100%)",
        }}
      >
        <div className="max-w-4xl mx-auto px-6 lg:px-16 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl animate-pulse bg-white/10" />
          <div className="h-10 w-3/4 mx-auto rounded animate-pulse bg-white/10" />
          <div className="h-4 w-1/2 mx-auto rounded animate-pulse bg-white/10" />
          <div className="h-4 w-2/3 mx-auto rounded animate-pulse bg-white/10" />
        </div>
      </section>

      {/* Core Value skeleton */}
      <section className="py-24 px-6 lg:px-16" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="max-w-6xl mx-auto text-center space-y-10">
          <div className="h-8 w-48 mx-auto rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
          <div className="flex flex-wrap justify-center gap-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-40 h-28 rounded-2xl animate-pulse bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        </div>
      </section>

      {/* Kebijakan Mutu skeleton */}
      <section className="py-24 px-6 lg:px-16" style={{ backgroundColor: "var(--bg-secondary)" }}>
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="h-8 w-64 mx-auto rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-full rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-5/6 mx-auto rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-3 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 w-3/4 mx-auto rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
        </div>
      </section>

      {/* Company Profile Viewer skeleton */}
      <section className="py-24 px-6 lg:px-16" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="h-6 w-40 mx-auto rounded-full animate-pulse bg-slate-200 dark:bg-slate-800" />
          <div className="h-8 w-72 mx-auto rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-96 mx-auto rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
          <div className="aspect-video w-full rounded-2xl animate-pulse bg-slate-200 dark:bg-slate-800 mt-8" />
        </div>
      </section>

      {/* Tim Kami skeleton */}
      <section className="py-24 px-6 lg:px-16" style={{ backgroundColor: "var(--bg-primary)" }}>
        <div className="max-w-6xl mx-auto text-center space-y-10">
          <div className="h-8 w-40 mx-auto rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border p-6 flex flex-col items-center space-y-4" style={{ borderColor: "var(--border-subtle)" }}>
                <div className="w-24 h-24 rounded-full animate-pulse bg-slate-200 dark:bg-slate-800" />
                <div className="h-5 w-32 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 w-24 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-full rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Grup & Partner Kami skeleton */}
      <section className="py-24 px-6 lg:px-16 text-white" style={{ backgroundColor: "#0B1F3A" }}>
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row gap-16 xl:gap-12">
          <div className="w-full xl:w-1/2 space-y-8">
            <div className="h-8 w-40 rounded animate-pulse bg-white/10" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-36 rounded-2xl animate-pulse bg-white/10" />
              ))}
            </div>
          </div>
          <div className="hidden xl:block w-px bg-white/15 self-stretch" />
          <div className="w-full xl:w-1/2 space-y-8">
            <div className="h-8 w-40 rounded animate-pulse bg-white/10" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-36 rounded-2xl animate-pulse bg-white/10" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Dual CTA skeleton */}
      <section className="py-24 px-6 lg:px-16" style={{ backgroundColor: "var(--bg-secondary)" }}>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1, 2].map((i) => (
            <div key={i} className="p-8 rounded-2xl border space-y-4" style={{ borderColor: "var(--border-subtle)" }}>
              <div className="w-12 h-12 rounded-xl animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="h-6 w-48 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-full rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-3/4 rounded animate-pulse bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
