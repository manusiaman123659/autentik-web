export default function Loading() {
  return <div aria-busy="true" className="container-custom py-6 space-y-6 motion-safe:animate-pulse">
    <div className="h-8 w-2/3 rounded bg-page-alt" /><div className="h-4 w-full max-w-xl rounded bg-page-alt" />
    <div className="h-12 rounded border border-base bg-page-alt" />
    <div className="h-11 rounded bg-page-alt" />
    <div className="flex gap-6">
      <div className="hidden lg:block w-56 xl:w-60 shrink-0 rounded border border-base bg-page-alt" />
      <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="rounded border border-base overflow-hidden">
          <div className="aspect-[4/3] bg-page-alt" /><div className="p-4 space-y-4">
            <div className="h-4 w-1/3 bg-page-alt" /><div className="h-16 bg-page-alt" /><div className="h-6 w-2/3 bg-page-alt" /><div className="h-11 bg-page-alt" />
          </div>
        </div>)}
      </div>
    </div>
  </div>;
}
