import { useState } from 'react';
import { emptyApi } from '@shared/api/emptyApi';
import { Badge } from '@shared/ui/Badge';
import { Button } from '@shared/ui/Button';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { ErrorBanner } from '@shared/ui/ErrorBanner';

interface MemberRecord {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  businessName?: string;
  memberId?: string;
  tierName?: string;
  status: 'pending_payment' | 'active' | 'expired' | 'suspended';
  memberSince?: string;
  expiresAt?: string;
}


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

interface NestedMemberItem {
  profile: {
    id: string; userId: string; memberId: string; tierId: string;
    status: MemberRecord['status']; firstName: string; lastName: string;
    businessName?: string; memberSince?: string; expiresAt?: string;
  };
  tier: { id: string; displayName: string };
  email: string;
}

const adminApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllMembers: builder.query<MemberRecord[], { page?: number; search?: string }>({
      query: ({ page = 1, search = '' }) => `/membership?page=${page}&search=${encodeURIComponent(search)}`,
      transformResponse: (res: ApiResponse<NestedMemberItem[]>) =>
        res.data.map((item) => ({
          id: item.profile.id,
          userId: item.profile.userId,
          memberId: item.profile.memberId,
          firstName: item.profile.firstName,
          lastName: item.profile.lastName,
          email: item.email,
          businessName: item.profile.businessName,
          tierName: item.tier?.displayName,
          status: item.profile.status,
          memberSince: item.profile.memberSince,
          expiresAt: item.profile.expiresAt,
        })),
      providesTags: ['AdminMembers'],
    }),
getAuditLog: builder.query<AuditEntry[], { page?: number }>({
      query: ({ page = 1 }) => ({ url: '/admin/audit-log', params: { page, limit: 50 } }),
      transformResponse: (res: ApiResponse<{ items: AuditEntry[] }>) => res.data.items,
    }),
    deactivateUser: builder.mutation<void, string>({
      query: (userId) => ({ url: `/admin/users/${userId}/deactivate`, method: 'PATCH' }),
      invalidatesTags: ['AdminMembers'],
    }),
    reactivateUser: builder.mutation<void, string>({
      query: (userId) => ({ url: `/admin/users/${userId}/reactivate`, method: 'PATCH' }),
      invalidatesTags: ['AdminMembers'],
    }),
  }),
  overrideExisting: false,
});

const {
  useGetAllMembersQuery, useDeactivateUserMutation, useReactivateUserMutation,
  useGetAuditLogQuery,
} = adminApi;

const demoMembers: MemberRecord[] = [
  { id: '1', userId: 'u1', firstName: 'Aminu', lastName: 'Garba', email: 'aminu.garba@example.com', businessName: 'Garba Textiles Ltd', memberId: 'KAC-2024-0041', tierName: 'Ordinary', status: 'active', memberSince: '2024-01-15T00:00:00Z', expiresAt: '2025-01-15T00:00:00Z' },
  { id: '2', userId: 'u2', firstName: 'Fatima', lastName: 'Usman', email: 'fatima.usman@example.com', businessName: 'Usman Agro Exports', memberId: 'KAC-2024-0042', tierName: 'Associate', status: 'active', memberSince: '2024-02-20T00:00:00Z', expiresAt: '2025-02-20T00:00:00Z' },
  { id: '3', userId: 'u3', firstName: 'Ibrahim', lastName: 'Musa', email: 'ibrahim.musa@example.com', businessName: 'Musa Trading Co.', memberId: 'KAC-2025-0003', tierName: 'Ordinary', status: 'pending_payment' },
  { id: '4', userId: 'u4', firstName: 'Hauwa', lastName: 'Bello', email: 'hauwa.bello@example.com', businessName: 'Bello Leather Works', memberId: 'KAC-2023-0198', tierName: 'Patron', status: 'expired', memberSince: '2023-05-10T00:00:00Z', expiresAt: '2024-05-10T00:00:00Z' },
  { id: '5', userId: 'u5', firstName: 'Yusuf', lastName: 'Dantata', email: 'yusuf.dantata@example.com', businessName: 'Dantata Holdings', memberId: 'KAC-2024-0089', tierName: 'Corporate', status: 'active', memberSince: '2024-04-01T00:00:00Z', expiresAt: '2025-04-01T00:00:00Z' },
];


const demoAudit: AuditEntry[] = [
  { id: 'a1', actorName: 'Admin User', action: 'MEMBER_APPROVED', resourceType: 'member', resourceId: 'KAC-2025-0003', createdAt: '2025-05-22T10:00:00Z', ipAddress: '102.89.45.12' },
  { id: 'a2', actorName: 'Staff Operator', action: 'ECO_REVIEWED', resourceType: 'eco_certificate', resourceId: 'ECO-2025-041', createdAt: '2025-05-21T15:30:00Z', ipAddress: '102.89.45.13' },
  { id: 'a3', actorName: 'Admin User', action: 'USER_DEACTIVATED', resourceType: 'user', resourceId: 'u4', createdAt: '2025-05-20T09:00:00Z', ipAddress: '102.89.45.12' },
  { id: 'a4', actorName: 'member@demo.kaccima', action: 'ECO_SUBMITTED', resourceType: 'eco_certificate', resourceId: 'ECO-2025-042', createdAt: '2025-05-19T13:00:00Z', ipAddress: '197.211.52.44' },
];

const statusVariant: Record<MemberRecord['status'], 'success' | 'warning' | 'default' | 'error'> = {
  active: 'success', pending_payment: 'warning', expired: 'error', suspended: 'default',
};

const TABS = [
  { id: 'members', label: 'Members' },
  { id: 'audit', label: 'Audit Log' },
] as const;
type Tab = typeof TABS[number]['id'];

function MemberDetailModal({ member, onClose }: { member: MemberRecord; onClose: () => void }) {
  const [deactivate, { isLoading: deactivating }] = useDeactivateUserMutation();
  const [reactivate, { isLoading: reactivating }] = useReactivateUserMutation();
  const [error, setError] = useState<string | null>(null);

  const handleDeactivate = async () => {
    try { await deactivate(member.userId).unwrap(); onClose(); }
    catch { setError('Action failed. Please try again.'); }
  };
  const handleReactivate = async () => {
    try { await reactivate(member.userId).unwrap(); onClose(); }
    catch { setError('Action failed. Please try again.'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="border-b border-[#bec9bf]/40 px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-[#221a0f]">Member Details</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#fdf8f3] text-[#8A7E6E]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6">
          {error && <div className="mb-4"><ErrorBanner message={error} /></div>}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-[#00502e]/10 flex items-center justify-center text-[#00502e] font-bold text-lg">
              {member.firstName[0]}{member.lastName[0]}
            </div>
            <div>
              <p className="font-semibold text-[#221a0f]">{member.firstName} {member.lastName}</p>
              <p className="text-sm text-[#8A7E6E]">{member.email}</p>
            </div>
            <div className="ml-auto">
              <Badge variant={statusVariant[member.status ?? 'pending_payment']}>{(member.status ?? 'unknown').replace(/_/g, ' ')}</Badge>
            </div>
          </div>
          <dl className="divide-y divide-[#bec9bf]/30">
            {[
              { label: 'Business Name', value: member.businessName ?? '—' },
              { label: 'Member ID', value: member.memberId ?? '—' },
              { label: 'Membership Tier', value: member.tierName ?? '—' },
              { label: 'Member Since', value: member.memberSince ? new Date(member.memberSince).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
              { label: 'Expires', value: member.expiresAt ? new Date(member.expiresAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
            ].map((row) => (
              <div key={row.label} className="grid grid-cols-2 gap-4 py-3">
                <dt className="text-sm text-[#8A7E6E]">{row.label}</dt>
                <dd className="text-sm text-[#221a0f] capitalize">{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={onClose}>Close</Button>
            {member.status === 'active' && (
              <Button loading={deactivating} onClick={handleDeactivate} className="bg-red-600 hover:bg-red-700 text-white">
                Deactivate
              </Button>
            )}
            {member.status === 'suspended' && (
              <Button loading={reactivating} onClick={handleReactivate}>Reactivate</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


function AuditLogTab() {
  const { data, isLoading } = useGetAuditLogQuery({ page: 1 });
  const entries = data ?? demoAudit;
  if (isLoading) return <SkeletonCard />;
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
  const [tab, setTab] = useState<Tab>('members');
  const [search, setSearch] = useState('');
  const [viewMember, setViewMember] = useState<MemberRecord | null>(null);
  const { data, isLoading } = useGetAllMembersQuery({ search });

  const members = data ?? demoMembers;
  const filtered = search ? members.filter((m) =>
    `${m.firstName} ${m.lastName} ${m.email} ${m.businessName ?? ''} ${m.memberId ?? ''}`.toLowerCase().includes(search.toLowerCase())
  ) : members;

  const handleExportCSV = () => {
    const headers = ['Member ID', 'First Name', 'Last Name', 'Email', 'Business', 'Tier', 'Status', 'Expires'];
    const rows = filtered.map((m) => [
      m.memberId ?? '', m.firstName, m.lastName, m.email,
      m.businessName ?? '', m.tierName ?? '', m.status ?? '',
      m.expiresAt ? new Date(m.expiresAt).toLocaleDateString('en-NG') : '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'kaccima-members.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-6xl">
      {viewMember && <MemberDetailModal member={viewMember} onClose={() => setViewMember(null)} />}

      <h1 className="text-2xl font-semibold text-[#221a0f] mb-1">Admin Console</h1>
      <p className="text-sm text-[#8A7E6E] mb-6">Secretariat management and member administration.</p>

      <div className="flex gap-1 bg-[#fdf8f3] rounded-lg p-1 mb-6 w-fit border border-[#bec9bf]/40">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t.id ? 'bg-white text-[#221a0f] shadow-sm' : 'text-[#8A7E6E] hover:text-[#221a0f]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'members' && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <input type="search" placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-sm rounded-lg border border-[#bec9bf]/60 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00502e]/30 focus:border-[#00502e]" />
            <Button variant="outline" className="whitespace-nowrap" onClick={handleExportCSV}>Export CSV</Button>
          </div>
          {isLoading ? <SkeletonCard /> : (
            <div className="bg-white rounded-xl border border-[#bec9bf]/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#bec9bf]/40 bg-[#fdf8f3]">
                      {['Member', 'ID', 'Tier', 'Status', 'Expires', 'Actions'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 font-medium text-[#8A7E6E] text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#bec9bf]/20">
                    {filtered.map((member) => (
                      <tr key={member.id} className="hover:bg-[#fdf8f3] transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#221a0f]">{member.firstName} {member.lastName}</p>
                          <p className="text-xs text-[#8A7E6E]">{member.businessName ?? member.email}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#00502e]">{member.memberId ?? '—'}</td>
                        <td className="px-4 py-3 capitalize text-[#221a0f]">{member.tierName ?? '—'}</td>
                        <td className="px-4 py-3"><Badge variant={statusVariant[member.status ?? 'pending_payment']}>{(member.status ?? 'unknown').replace(/_/g, ' ')}</Badge></td>
                        <td className="px-4 py-3 text-[#8A7E6E]">
                          {member.expiresAt ? new Date(member.expiresAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setViewMember(member)} className="text-xs text-[#00502e] hover:underline font-medium">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'audit' && <AuditLogTab />}
    </div>
  );
}
