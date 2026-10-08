import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center sm:p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-amber-600">404</p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-3 text-sm text-slate-600">The page or storefront may have moved or is no longer available.</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700">
          Return home
        </Link>
      </div>
    </main>
  );
}
