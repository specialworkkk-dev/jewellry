import Link from "next/link";

export function AdminSearchForm({ q, placeholder }: { q: string; placeholder: string }) {
  return (
    <form method="get" className="flex flex-wrap items-center gap-2">
      <input
        name="q"
        defaultValue={q}
        maxLength={100}
        placeholder={placeholder}
        aria-label="Search"
        className="min-h-11 min-w-0 flex-1 basis-48 rounded-md border px-3 py-2 text-base sm:max-w-sm sm:flex-none sm:basis-80 sm:text-sm"
      />
      <button type="submit" className="min-h-11 rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-black">Search</button>
      {q && <Link href="?" className="inline-flex min-h-11 items-center px-2 text-sm text-gray-500 hover:text-gray-800">Clear</Link>}
    </form>
  );
}

export function AdminPagination({ q, page, size, total }: { q: string; page: number; size: number; total: number }) {
  const pages = Math.max(1, Math.ceil(total / size));
  const href = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    if (size !== 25) params.set("size", String(size));
    const s = params.toString();
    return s ? `?${s}` : "?";
  };
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(total, page * size);
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-gray-600">
      <span>{from}–{to} of {total.toLocaleString("en-IN")}</span>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {page > 1 ? <Link href={href(page - 1)} className="inline-flex min-h-11 items-center px-2 font-medium text-amber-700 hover:underline">Previous</Link> : <span className="inline-flex min-h-11 items-center px-2 text-gray-300">Previous</span>}
        <span>Page {Math.min(page, pages)} of {pages}</span>
        {page < pages ? <Link href={href(page + 1)} className="inline-flex min-h-11 items-center px-2 font-medium text-amber-700 hover:underline">Next</Link> : <span className="inline-flex min-h-11 items-center px-2 text-gray-300">Next</span>}
      </div>
    </div>
  );
}
