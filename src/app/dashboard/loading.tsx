export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6" role="status" aria-label="Loading owner page">
      <div className="space-y-2">
        <div className="h-8 w-52 rounded bg-gray-200" />
        <div className="h-4 w-80 max-w-full rounded bg-gray-100" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-xl border bg-white p-4 shadow-sm">
            <div className="h-4 w-24 rounded bg-gray-100" />
            <div className="mt-5 h-7 w-12 rounded bg-gray-200" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-64 rounded-xl border bg-white" />
        <div className="h-64 rounded-xl border bg-white" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
