export default function Loading() {
  return <div aria-busy="true" className="container-custom py-6 space-y-6 motion-safe:animate-pulse">
    <div className="h-11 w-40 bg-page-alt rounded" /><div className="h-20 w-5/6 bg-page-alt rounded" />
    <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 lg:gap-8">
      <div className="h-[220px] sm:h-[300px] lg:h-[360px] border border-base bg-page-alt rounded" />
      <div className="rounded border border-base p-6 space-y-5">
        <div className="h-10 w-2/3 bg-page-alt" /><div className="h-5 w-1/3 bg-page-alt" />
        <div className="h-24 bg-page-alt" /><div className="h-12 bg-page-alt" /><div className="h-12 bg-page-alt" />
      </div>
    </div>
    <div className="grid lg:grid-cols-2 gap-6"><div className="h-60 bg-page-alt" /><div className="h-60 bg-page-alt" /></div>
  </div>;
}
