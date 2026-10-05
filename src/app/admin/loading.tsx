export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6" role="status" aria-label="Loading admin page">
      <div className="h-8 w-48 rounded bg-gray-200" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-xl border bg-white p-4">
            <div className="h-4 w-24 rounded bg-gray-100" />
            <div className="mt-5 h-7 w-12 rounded bg-gray-200" />
          </div>
        ))}
      </div>
      <div className="h-72 rounded-xl border bg-white" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
