// Rendered with HTTP 403 (and noindex) when a suspended storefront is requested.
export default function ShopForbidden() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
          <span className="text-2xl font-bold">!</span>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Account Suspended</h1>
        <p className="mb-6 text-gray-500">This digital storefront is currently unavailable.</p>
        <a href="mailto:support@luxestore.com" className="inline-block rounded-full bg-gray-900 px-6 py-3 font-medium text-white transition-colors hover:bg-black">
          Contact Support
        </a>
      </div>
    </div>
  );
}
