export function PageLoader() {
  return (
    <div className="flex h-full min-h-[300px] items-center justify-center p-12">
      <div className="flex flex-col items-center gap-3">
        <span
          className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-t-transparent"
          style={{ borderColor: '#002046', borderTopColor: 'transparent' }}
        />
        <p className="text-sm text-[#74777f]">Loading…</p>
      </div>
    </div>
  );
}
