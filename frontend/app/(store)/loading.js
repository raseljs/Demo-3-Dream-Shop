export default function Loading() {
  return (
    <div className="container-x py-6" aria-busy="true">
      <div className="mb-4 h-6 w-48 animate-pulse rounded bg-slate-100" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-100 p-3">
            <div className="aspect-square animate-pulse rounded-xl bg-slate-100" />
            <div className="mt-3 h-4 animate-pulse rounded bg-slate-100" />
            <div className="mx-auto mt-2 h-4 w-1/2 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
