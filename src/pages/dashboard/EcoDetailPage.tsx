import type { ReactNode } from 'react';
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import {
  useGetEcoCertificateQuery,
  useReIssueCertificateMutation,
  useLazyGetEcoCertDownloadUrlQuery,
  useGetEcoChambersQuery,
  type ECertStatus,
} from '@features/eco/ecoApi';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { Badge } from '@shared/ui/Badge';
import { Button } from '@shared/ui/Button';

const statusVariant: Record<ECertStatus, 'success' | 'warning' | 'error' | 'default'> = {
  issued: 'success', approved: 'success',
  submitted: 'warning', under_review: 'warning', pending_payment: 'warning',
  draft: 'default',
  rejected: 'error', revision_requested: 'error',
};

const statusLabel: Record<ECertStatus, string> = {
  draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review',
  pending_payment: 'Pending Payment', approved: 'Approved', issued: 'Issued',
  rejected: 'Rejected', revision_requested: 'Revision Required',
};

const ADMIN_ROLES = ['super_admin', 'chamber_admin', 'staff_operator', 'chamber_executive'];

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex items-start py-3 border-b border-[#bec9bf]/20 last:border-0">
    <span className="w-44 shrink-0 text-sm text-[#8A7E6E]">{label}</span>
    <span className="text-sm text-[#221a0f] font-medium">{value ?? '—'}</span>
  </div>
);

export function EcoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const role = useAppSelector((s) => s.auth.role);
  const isAdmin = role && ADMIN_ROLES.includes(role);
  const isReadOnly = role === 'chamber_executive';

  const { data: cert, isLoading, isError, refetch } = useGetEcoCertificateQuery(id!);
  const { data: chambers = [] } = useGetEcoChambersQuery();
  const [reIssue, { isLoading: reIssuing }] = useReIssueCertificateMutation();
  const [fetchDownloadUrl] = useLazyGetEcoCertDownloadUrlQuery();
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [reIssueErrorMsg, setReIssueErrorMsg] = useState<string | null>(null);

  if (isLoading) return <div className="p-6 max-w-3xl"><SkeletonCard /></div>;
  if (isError || !cert) return (
    <div className="p-6 max-w-3xl">
      <ErrorBanner message="Failed to load certificate details. You may not have permission to view this certificate." />
      <Link to="/dashboard/eco" className="inline-block mt-4 text-sm text-[#023293] hover:underline">
        ← Back
      </Link>
    </div>
  );

  const fmtDate = (d?: string | Date | null) =>
    d ? new Date(d as string).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' }) : null;

  const hasPdf = !!(cert.signedDownloadUrl ?? cert.certificatePdfUrl);
  const isIssued = cert.status === 'issued';
  const isApprovedNoDoc = (cert.status === 'approved' || cert.status === 'issued') && !hasPdf;

  const handleReIssue = async () => {
    setReIssueErrorMsg(null);
    try {
      await reIssue(cert.id).unwrap();
      refetch();
    } catch (err: unknown) {
      const apiMsg = (err as { data?: { message?: string } })?.data?.message;
      setReIssueErrorMsg(apiMsg ?? 'Failed to generate certificate. Please try again.');
    }
  };

  // Fetches a fresh signed URL from the server then opens it — avoids stale/private S3 URLs
  const openSignedUrl = async (mode: 'download' | 'print') => {
    setDownloadError(null);
    setDownloadLoading(true);
    try {
      const result = await fetchDownloadUrl(cert.id).unwrap();
      if (mode === 'download') {
        const a = document.createElement('a');
        a.href = result.url;
        a.download = `eCO-${cert.certificateNumber ?? cert.id}.pdf`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        window.open(result.url, '_blank', 'noopener,noreferrer');
      }
    } catch (err: unknown) {
      const apiMsg = (err as { data?: { message?: string } })?.data?.message;
      setDownloadError(apiMsg ?? 'Could not retrieve the certificate. Please try again.');
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link to="/dashboard/eco" className="text-sm text-[#8A7E6E] hover:text-[#023293]">
          {isAdmin ? 'eCO Queue' : 'eCO Certificates'}
        </Link>
        <span className="text-[#bec9bf]">/</span>
        <span className="text-sm text-[#221a0f] font-medium">
          {cert.certificateNumber ?? cert.id.slice(0, 8).toUpperCase()}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#221a0f]">
            {cert.certificateNumber ?? 'Application Details'}
          </h1>
          <p className="text-sm text-[#8A7E6E] mt-0.5">Certificate of Origin</p>
        </div>
        <Badge variant={statusVariant[cert.status]}>{statusLabel[cert.status]}</Badge>
      </div>

      {/* Status notices */}
      {cert.status === 'rejected' && cert.rejectionReason && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <strong>Rejection reason:</strong> {cert.rejectionReason}
        </div>
      )}
      {cert.status === 'revision_requested' && cert.revisionNotes && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <strong>Revision required:</strong> {cert.revisionNotes}
        </div>
      )}
      {isApprovedNoDoc && (
        <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
          {cert.status === 'issued'
            ? 'The certificate PDF is missing or could not be retrieved (possible storage error).'
            : 'This certificate was approved but the PDF was not generated (possible upload error).'}
          {isAdmin && !isReadOnly && (
            <span> Use the button below to re-generate it.</span>
          )}
        </div>
      )}
      {(reIssueErrorMsg || downloadError) && (
        <div className="mb-4">
          <ErrorBanner message={reIssueErrorMsg ?? downloadError ?? 'An error occurred.'} />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Download — fetches a fresh signed URL from server */}
        {hasPdf && (
          <Button
            loading={downloadLoading}
            onClick={() => openSignedUrl('download')}
            className="bg-[#023293] hover:bg-[#0267bf] text-white"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Certificate
          </Button>
        )}

        {/* Print — opens PDF in new tab via signed URL (user prints from browser) */}
        {hasPdf && (
          <Button variant="outline" loading={downloadLoading} onClick={() => openSignedUrl('print')}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Certificate
          </Button>
        )}

        {/* Admin: re-generate PDF for approved certs without a document */}
        {isAdmin && !isReadOnly && isApprovedNoDoc && (
          <Button loading={reIssuing} onClick={handleReIssue} className="bg-[#795900] hover:bg-[#5c4300] text-white">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Re-generate Certificate
          </Button>
        )}

        {/* Admin: re-issue replacement copy */}
        {isAdmin && !isReadOnly && isIssued && hasPdf && (
          <Button variant="outline" loading={reIssuing} onClick={handleReIssue}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Re-issue (Replacement Copy)
          </Button>
        )}
      </div>

      {/* Certificate details */}
      <div className="bg-white rounded-xl border border-[#bec9bf]/40 overflow-hidden mb-4">
        <div className="px-6 py-3 border-b border-[#bec9bf]/40">
          <h2 className="text-xs font-semibold text-[#8A7E6E] uppercase tracking-wide">Certificate Info</h2>
        </div>
        <div className="px-6">
          <Row label="Certificate #" value={cert.certificateNumber ?? '—'} />
          <Row label="Status" value={<Badge variant={statusVariant[cert.status]}>{statusLabel[cert.status]}</Badge>} />
          <Row label="Applied" value={fmtDate(cert.createdAt)} />
          <Row label="Issued" value={cert.issuedAt ? fmtDate(cert.issuedAt) : '—'} />
          <Row label="Application Fee" value={cert.applicationFee != null ? `₦${cert.applicationFee}` : '—'} />
          {cert.paymentRef && <Row label="Payment Ref" value={<span className="font-mono text-xs">{cert.paymentRef}</span>} />}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#bec9bf]/40 overflow-hidden mb-4">
        <div className="px-6 py-3 border-b border-[#bec9bf]/40">
          <h2 className="text-xs font-semibold text-[#8A7E6E] uppercase tracking-wide">Product Details</h2>
        </div>
        <div className="px-6">
          <Row label="Solid Mineral" value={cert.solidMineralName} />
          <Row label="Description (Quality)" value={cert.descriptionOfGoods} />
          <Row label="Origin of Goods" value={cert.originOfGoods} />
          <Row label="Destination Country" value={cert.destinationCountry} />
          {cert.batchIdNo && <Row label="Batch ID/No" value={cert.batchIdNo} />}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#bec9bf]/40 overflow-hidden mb-4">
        <div className="px-6 py-3 border-b border-[#bec9bf]/40">
          <h2 className="text-xs font-semibold text-[#8A7E6E] uppercase tracking-wide">Company Details</h2>
        </div>
        <div className="px-6">
          <Row label="Company Name" value={cert.companyName} />
          <Row label="Address" value={cert.companyAddress} />
          {cert.companyEmail && <Row label="Email" value={cert.companyEmail} />}
          {cert.companyPhone && <Row label="Phone" value={cert.companyPhone} />}
          <Row label="License Owner" value={cert.isLicenseOwner ? `Yes — ${cert.miningLicenseNo ?? '—'}` : 'No'} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#bec9bf]/40 overflow-hidden mb-6">
        <div className="px-6 py-3 border-b border-[#bec9bf]/40">
          <h2 className="text-xs font-semibold text-[#8A7E6E] uppercase tracking-wide">Commercial Information</h2>
        </div>
        <div className="px-6">
          <Row label="Invoice Total" value={`₦${cert.invoiceTotal.toLocaleString()}`} />
          <Row label="Chamber of Commerce" value={chambers.find((c) => c.id === cert.chamberOfCommerceId)?.name ?? '—'} />
          <Row label="Chamber Member" value={cert.isChamberMember ? `Yes — ${cert.membershipId ?? '—'}` : 'No'} />
        </div>
      </div>

      <Link to="/dashboard/eco" className="text-sm text-[#8A7E6E] hover:text-[#023293]">
        ← Back to {isAdmin ? 'queue' : 'all applications'}
      </Link>
    </div>
  );
}
