import { emptyApi } from '@shared/api/emptyApi';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { PageHeader } from '@shared/ui/PageHeader';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { EmptyState } from '@shared/ui/EmptyState';
import { TableCard } from '@shared/ui/TableCard';

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


const fmtAction = (a: string) => a.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

function AuditLogTab() {
  const { data, isLoading, isError, refetch } = useGetAuditLogQuery({ page: 1 });
  if (isLoading) return <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} className="h-12 min-h-0" />)}</div>;
  if (isError) return <ErrorBanner message="Couldn't load the audit log." onRetry={refetch} />;
  const entries = data ?? [];
  if (entries.length === 0) {
    return <EmptyState icon="history" title="No activity recorded yet" message="Every payment, review decision and document action is written here as it happens." />;
  }
  return (
    <TableCard footer={`Showing the latest ${entries.length} entries. Entries cannot be edited or deleted.`}>
      <table className="data-table">
        <thead>
          <tr><th scope="col">When</th><th scope="col">Action</th><th scope="col">By</th><th scope="col">Record</th></tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="num whitespace-nowrap text-ink-subtle">
                {new Date(entry.createdAt).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </td>
              <td className="whitespace-nowrap font-medium">{fmtAction(entry.action)}</td>
              <td>{entry.actorName || '–'}</td>
              <td className="font-mono text-[12px] text-ink-muted">{entry.resourceType}/{entry.resourceId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableCard>
  );
}

export function AdminPage() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader title="Audit log" description="An append-only record of every financial and document action, with who did it and when." />
      <AuditLogTab />
    </div>
  );
}
