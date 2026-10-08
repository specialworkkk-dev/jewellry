"use client";

import "./globals.css";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body style={{ margin: 0 }}>
        <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-4 sm:p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center sm:p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-600">LuxeStore</p>
            <h1 className="mt-3 text-2xl font-bold text-slate-900">Something went wrong</h1>
            <p className="mt-3 text-sm text-slate-600">We could not load this page. Please try again.</p>
            <button type="button" onClick={reset} className="mt-6 min-h-11 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700">
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
