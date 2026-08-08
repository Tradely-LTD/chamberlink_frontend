import { emptyApi } from '@shared/api/emptyApi';
import { SkeletonCard } from '@shared/ui/SkeletonCard';

interface AuditEntry {
  id: string;
  actorName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  createdAt: string;
  ipAddress?: string;
}

interface ApiResponse<T> { success: boolean; data: T; message?: string; }

const adminApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    getAuditLog: builder.query<AuditEntry[], { page?: number }>({
      query: ({ page = 1 }) => ({ url: '/admin/audit-log', params: { page, limit: 50 } }),
      transformResponse: (res: ApiResponse<{ items: AuditEntry[] }>) => res.data.items,
    }),
  }),
  overrideExisting: false,
});

const { useGetAuditLogQuery } = adminApi;

const demoAudit: AuditEntry[] = [
  { id: 'a1', actorName: 'Admin User', action: 'MEMBER_APPROVED', resourceType: 'member', resourceId: 'KAC-2025-0003', createdAt: '2025-05-22T10:00:00Z', ipAddress: '102.89.45.12' },
  { id: 'a2', actorName: 'Staff Operator', action: 'ECO_REVIEWED', resourceType: 'eco_certificate', resourceId: 'ECO-2025-041', createdAt: '2025-05-21T15:30:00Z', ipAddress: '102.89.45.13' },
  { id: 'a3', actorName: 'Admin User', action: 'USER_DEACTIVATED', resourceType: 'user', resourceId: 'u4', createdAt: '2025-05-20T09:00:00Z', ipAddress: '102.89.45.12' },
  { id: 'a4', actorName: 'member@demo.naccima', action: 'ECO_SUBMITTED', resourceType: 'eco_certificate', resourceId: 'ECO-2025-042', createdAt: '2025-05-19T13:00:00Z', ipAddress: '197.211.52.44' },
];

function AuditLogTab() {
  const { data, isLoading } = useGetAuditLogQuery({ page: 1 });
  const entries = data ?? demoAudit;
  if (isLoading) return <SkeletonCard className="h-64" />;
  return (
    <div className="bg-white rounded-xl border border-[#bec9bf]/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-[#bec9bf]/40 bg-[#fdf8f3]">
        <p className="text-xs font-medium text-[#8A7E6E] uppercase tracking-wide">Immutable Audit Trail — append-only log of all financial and document actions</p>
      </div>
      <div className="divide-y divide-[#bec9bf]/20">
        {entries.map((entry) => (
          <div key={entry.id} className="px-4 py-3 flex items-start gap-4 hover:bg-[#fdf8f3]">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono bg-[#00502e]/10 text-[#00502e] px-2 py-0.5 rounded">{entry.action}</span>
                <span className="text-sm text-[#221a0f]">{entry.actorName}</span>
                <span className="text-xs text-[#8A7E6E]">on</span>
                <span className="text-xs font-mono text-[#8A7E6E]">{entry.resourceType}/{entry.resourceId}</span>
              </div>
              {entry.ipAddress && <p className="text-xs text-[#bec9bf] mt-0.5">IP: {entry.ipAddress}</p>}
            </div>
            <span className="text-xs text-[#8A7E6E] flex-shrink-0">
              {new Date(entry.createdAt).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminPage() {
  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-2xl font-semibold text-[#221a0f] mb-1">Audit Log</h1>
      <p className="text-sm text-[#8A7E6E] mb-6">Immutable, append-only record of all financial and document actions.</p>
      <AuditLogTab />
    </div>
  );
}
