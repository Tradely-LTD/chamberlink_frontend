export function PageLoader() {
  return (
    <div className="flex h-full min-h-[300px] items-center justify-center p-12" role="status">
      <div className="flex flex-col items-center gap-3">
        <span className="inline-block h-7 w-7 animate-spin rounded-full border-[2.5px] border-primary-200 border-t-primary" />
        <p className="text-[13px] text-ink-subtle">Loading…</p>
      </div>
    </div>
  );
}
