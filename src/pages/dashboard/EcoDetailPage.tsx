import type { ReactNode } from 'react';
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import {
  useGetEcoCertificateQuery,
  useReIssueCertificateMutation,
  useLazyGetEcoCertDownloadUrlQuery,
  useLazyGetEcoDocumentUrlQuery,
  type ECertStatus,
} from '@features/eco/ecoApi';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { Badge } from '@shared/ui/Badge';
import { Button } from '@shared/ui/Button';

const statusVariant: Record<ECertStatus, 'success' | 'warning' | 'error' | 'default'> = {
  issued: 'success', approved: 'warning',
  submitted: 'warning', under_review: 'warning', pending_payment: 'warning',
  draft: 'default',
  rejected: 'error', revision_requested: 'error',
};

const statusLabel: Record<ECertStatus, string> = {
  draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review',
  pending_payment: 'Awaiting Payment', approved: 'Approved — Awaiting Payment', issued: 'Issued',
  rejected: 'Rejected', revision_requested: 'Revision Required',
};

const MEANS_OF_TRANSPORT_LABEL: Record<string, string> = { sea: 'Sea', air: 'Air', land: 'Land' };

const ADMIN_ROLES = ['super_admin', 'chamber_admin', 'staff_operator', 'chamber_executive'];

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex items-start py-3 border-b border-border/20 last:border-0">
    <span className="w-56 shrink-0 text-sm text-ink-subtle">{label}</span>
    <span className="text-sm text-ink font-medium">{value ?? '—'}</span>
  </div>
);

// A compliance-document row that's clickable when the doc is actually
// attached — fetches a fresh signed URL on click rather than storing one,
// since these S3 URLs expire.
const DocRow = ({ label, certId, docType, attached }: {
  label: string; certId: string; docType: 'invoice' | 'signature' | 'cac' | 'nepc'; attached: boolean;
}) => {
  const [fetchUrl, { isFetching }] = useLazyGetEcoDocumentUrlQuery();
  const [error, setError] = useState<string | null>(null);

  const handleView = async () => {
    setError(null);
    try {
      const { url } = await fetchUrl({ certId, docType }).unwrap();
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Failed to open document');
    }
  };

  return (
    <div className="flex items-start py-3 border-b border-border/20 last:border-0">
      <span className="w-56 shrink-0 text-sm text-ink-subtle">{label}</span>
      {attached ? (
        <span className="flex items-center gap-2">
          <button
            onClick={handleView}
            disabled={isFetching}
            className="text-sm font-medium text-primary hover:underline disabled:opacity-60 disabled:no-underline"
          >
            {isFetching ? 'Opening…' : 'View Attached'}
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </span>
      ) : (
        <span className="text-sm text-ink font-medium">—</span>
      )}
    </div>
  );
};

export function EcoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const role = useAppSelector((s) => s.auth.role);
  const isAdmin = role && ADMIN_ROLES.includes(role);
  const isReadOnly = role === 'chamber_executive';

  const { data: cert, isLoading, isError, refetch } = useGetEcoCertificateQuery(id!);
  const [reIssue, { isLoading: reIssuing }] = useReIssueCertificateMutation();
  const [fetchDownloadUrl] = useLazyGetEcoCertDownloadUrlQuery();
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [reIssueErrorMsg, setReIssueErrorMsg] = useState<string | null>(null);

  if (isLoading) return <div className="p-6 max-w-3xl"><SkeletonCard /></div>;
  if (isError || !cert) return (
    <div className="p-6 max-w-3xl">
      <ErrorBanner message="Failed to load certificate details. You may not have permission to view this certificate." />
      <Link to="/dashboard/eco" className="inline-block mt-4 text-sm text-primary hover:underline">
        ← Back
      </Link>
    </div>
  );

  const fmtDate = (d?: string | Date | null) =>
    d ? new Date(d as string).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' }) : null;

  const hasPdf = !!(cert.signedDownloadUrl ?? cert.certificatePdfUrl);
  const isIssued = cert.status === 'issued';
  // 'approved' legitimately has no PDF yet (pre-payment) — only offer re-generate
  // for 'issued' certs missing a PDF, which is a genuine upload/storage failure.
  const isIssuedMissingDoc = cert.status === 'issued' && !hasPdf;

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
        <Link to="/dashboard/eco" className="text-sm text-ink-subtle hover:text-primary">
          {isAdmin ? 'eCO Queue' : 'eCO Certificates'}
        </Link>
        <span className="text-border">/</span>
        <span className="text-sm text-ink font-medium">
          {cert.certificateNumber ?? cert.id.slice(0, 8).toUpperCase()}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            {cert.certificateNumber ?? 'Application Details'}
          </h1>
          <p className="text-sm text-ink-subtle mt-0.5">Certificate of Origin — Solid Minerals</p>
        </div>
        <Badge variant={statusVariant[cert.status]}>{statusLabel[cert.status]}</Badge>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-2 mb-4">
        {cert.issuedRetrospectively && (
          <Badge variant="warning">ISSUED RETROSPECTIVELY</Badge>
        )}
        {cert.membershipVerified && (
          <Badge variant="success">Membership Verified</Badge>
        )}
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
      {cert.status === 'approved' && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Approved — payment is required before the certificate is issued.
        </div>
      )}
      {isIssuedMissingDoc && (
        <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
          The certificate PDF is missing or could not be retrieved (possible storage error).
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
            className="bg-primary hover:bg-primary-hover text-white"
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

        {/* Admin: re-generate PDF for issued certs missing a document (genuine failure) */}
        {isAdmin && !isReadOnly && isIssuedMissingDoc && (
          <Button loading={reIssuing} onClick={handleReIssue} className="bg-gold hover:bg-gold-hover text-white">
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

      {/* Certificate Info */}
      <div className="bg-white rounded-xl border border-border/40 overflow-hidden mb-4">
        <div className="px-6 py-3 border-b border-border/40">
          <h2 className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">Certificate Info</h2>
        </div>
        <div className="px-6">
          <Row label="Certificate #" value={cert.certificateNumber ?? '—'} />
          <Row label="Status" value={<Badge variant={statusVariant[cert.status]}>{statusLabel[cert.status]}</Badge>} />
          <Row label="Applied" value={fmtDate(cert.createdAt)} />
          <Row label="Issued" value={cert.issuedAt ? fmtDate(cert.issuedAt) : '—'} />
          <Row label="Application Fee (estimate/confirmed)" value={cert.applicationFee ? `₦${cert.applicationFee.toLocaleString()}` : '—'} />
          <Row label="Membership Verified" value={cert.membershipVerified ? 'Yes' : 'No'} />
          <Row label="Self-Declared Chamber Member" value={cert.selfDeclaredIsMember ? `Yes (${cert.selfDeclaredMembershipId ?? '—'})` : 'No'} />
          {cert.paymentRef && <Row label="Payment Ref" value={<span className="font-mono text-xs">{cert.paymentRef}</span>} />}
        </div>
      </div>

      {/* Product/Goods Details */}
      <div className="bg-white rounded-xl border border-border/40 overflow-hidden mb-4">
        <div className="px-6 py-3 border-b border-border/40">
          <h2 className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">Product / Goods Details</h2>
        </div>
        <div className="px-6">
          <Row label="Solid Mineral" value={cert.solidMineralName} />
          <Row label="HS Code" value={cert.hsCode} />
          <Row label="Description of Goods" value={cert.descriptionOfGoods} />
          <Row label="Number & Kind of Packages" value={cert.numberAndKindOfPackages} />
          <Row label="Marks and Numbers" value={cert.marksAndNumbers} />
          <Row label="Quantity" value={cert.quantity != null ? `${cert.quantity} ${cert.quantityUnit ?? ''}` : null} />
          <Row label="Origin States" value={cert.originStates?.length ? cert.originStates.join(', ') : null} />
          <Row label="Destination Country" value={cert.destinationCountry} />
          <Row label="Destination Port" value={cert.destinationPort} />
          <Row label="Batch/ID No." value={cert.batchIdNo} />
        </div>
      </div>

      {/* Exporter/Company Details */}
      <div className="bg-white rounded-xl border border-border/40 overflow-hidden mb-4">
        <div className="px-6 py-3 border-b border-border/40">
          <h2 className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">Exporter / Company Details</h2>
        </div>
        <div className="px-6">
          <Row label="License Owner" value={cert.isLicenseOwner ? `Yes (${cert.miningLicenseNo ?? '—'})` : 'No'} />
          <Row label="Company Name" value={cert.companyName} />
          <Row label="Company Address" value={cert.companyAddress} />
          <Row label="Company Country" value={cert.companyCountry} />
          <Row label="Company Email" value={cert.companyEmail} />
          <Row label="Company Phone" value={cert.companyPhone} />
        </div>
      </div>

      {/* Consignee Details */}
      <div className="bg-white rounded-xl border border-border/40 overflow-hidden mb-4">
        <div className="px-6 py-3 border-b border-border/40">
          <h2 className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">Consignee Details</h2>
        </div>
        <div className="px-6">
          <Row label="Consignee Name" value={cert.consigneeName} />
          <Row label="Consignee Address" value={cert.consigneeAddress} />
        </div>
      </div>

      {/* Shipment & Transport */}
      <div className="bg-white rounded-xl border border-border/40 overflow-hidden mb-4">
        <div className="px-6 py-3 border-b border-border/40">
          <h2 className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">Shipment & Transport</h2>
        </div>
        <div className="px-6">
          <Row label="Departure Date" value={cert.departureDate} />
          <Row label="Means of Transport" value={cert.meansOfTransport ? (MEANS_OF_TRANSPORT_LABEL[cert.meansOfTransport] ?? cert.meansOfTransport) : null} />
          <Row label="Vessel/Flight/Vehicle & Voyage No." value={cert.vesselFlightVehicleNameVoyageNo} />
          <Row label="Port of Loading" value={cert.portOfLoading} />
          <Row label="Port of Discharge" value={cert.portOfDischarge} />
        </div>
      </div>

      {/* Commercial Information */}
      <div className="bg-white rounded-xl border border-border/40 overflow-hidden mb-4">
        <div className="px-6 py-3 border-b border-border/40">
          <h2 className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">Commercial Information</h2>
        </div>
        <div className="px-6">
          <Row label="Invoice Number" value={cert.invoiceNumber} />
          <Row label="Invoice Date" value={cert.invoiceDate} />
          <Row label="Invoice Total" value={cert.invoiceTotal != null ? `₦${cert.invoiceTotal.toLocaleString()}` : null} />
          <Row label="Customer Order / LC No." value={cert.customerOrderOrLcNo} />
        </div>
      </div>

      {/* Compliance / Declaration docs */}
      <div className="bg-white rounded-xl border border-border/40 overflow-hidden mb-6">
        <div className="px-6 py-3 border-b border-border/40">
          <h2 className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">Compliance / Declaration Documents</h2>
        </div>
        <div className="px-6">
          <DocRow label="Invoice" certId={cert.id} docType="invoice" attached={!!cert.invoiceFileKey} />
          <DocRow label="Signature" certId={cert.id} docType="signature" attached={!!cert.signatureKey} />
          <DocRow label="CAC Certificate" certId={cert.id} docType="cac" attached={!!cert.cacCertificateKey} />
          <DocRow label="NEPC Certificate" certId={cert.id} docType="nepc" attached={!!cert.nepcCertificateKey} />
        </div>
      </div>

      <Link to="/dashboard/eco" className="text-sm text-ink-subtle hover:text-primary">
        ← Back to {isAdmin ? 'queue' : 'all applications'}
      </Link>
    </div>
  );
}
