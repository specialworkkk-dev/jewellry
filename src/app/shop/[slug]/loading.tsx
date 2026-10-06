export default function ShopLoading() {
  return (
    <div className="min-h-screen animate-pulse bg-[#fbf8f3]">
      <div className="h-[520px] bg-stone-800 sm:h-[620px]" />
      <div className="relative z-10 mx-auto -mt-6 grid max-w-5xl grid-cols-3 gap-px px-4">
        <div className="h-20 rounded-l-2xl bg-white" />
        <div className="h-20 bg-white" />
        <div className="h-20 rounded-r-2xl bg-white" />
      </div>
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="h-9 w-64 rounded bg-stone-200" />
        <div className="mt-8 grid grid-cols-1 gap-7 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 lg:gap-9">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-3xl bg-white">
              <div className="aspect-square bg-stone-200" />
              <div className="space-y-3 p-5">
                <div className="h-4 rounded bg-stone-200" />
                <div className="h-4 w-2/3 rounded bg-stone-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
