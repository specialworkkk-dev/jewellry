export default function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
