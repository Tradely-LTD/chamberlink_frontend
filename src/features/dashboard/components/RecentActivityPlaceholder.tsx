export function RecentActivityPlaceholder() {
  return (
    <div className="rounded-xl border border-[#bec9bf]/40 bg-white p-5">
      <p className="text-xs font-medium text-[#8A7E6E] uppercase tracking-wide mb-4">
        Recent Activity
      </p>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 text-sm text-[#8A7E6E]">
            <div className="h-2 w-2 rounded-full bg-[#bec9bf]" />
            <span>Activity feed coming soon</span>
          </div>
        ))}
      </div>
    </div>
  );
}
