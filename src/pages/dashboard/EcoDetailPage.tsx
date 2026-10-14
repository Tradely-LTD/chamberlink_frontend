import type { ReactNode } from 'react';
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import {
  useGetEcoCertificateQuery,
  useReIssueCertificateMutation,
  useRevokeEcoCertMutation,
  useResubmitRevokedEcoCertMutation,
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
  rejected: 'error', revision_requested: 'error', revoked: 'error',
};

const statusLabel: Record<ECertStatus, string> = {
  draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review',
  pending_payment: 'Awaiting Payment', approved: 'Approved — Awaiting Payment', issued: 'Issued',
  rejected: 'Rejected', revision_requested: 'Revision Required', revoked: 'Revoked',
};

const MEANS_OF_TRANSPORT_LABEL: Record<string, string> = { sea: 'Sea', air: 'Air', land: 'Land' };

// Display names for the three mode-specific transport documents (RFP §4.1.7).
// Read off the certificate's stored transportDocumentType rather than derived
// from its mode, so the label reflects what was actually filed.
const TRANSPORT_DOC_LABEL: Record<string, string> = {
  bill_of_lading: 'Bill of Lading',
  air_waybill: 'Air Waybill',
  road_consignment_note: 'Road Consignment Note',
};

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
  label: string; certId: string; docType: 'invoice' | 'signature' | 'cac' | 'nepc' | 'transport'; attached: boolean;
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
  const [revoke, { isLoading: revoking }] = useRevokeEcoCertMutation();
  const [resubmit, { isLoading: resubmitting }] = useResubmitRevokedEcoCertMutation();
  const navigate = useNavigate();
  const [fetchDownloadUrl] = useLazyGetEcoCertDownloadUrlQuery();
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [reIssueErrorMsg, setReIssueErrorMsg] = useState<string | null>(null);
  // Revoking a live trade document is not an undo-able click, so the reason is
  // typed into an expanded panel rather than a confirm() — it is also the text
  // the applicant receives, so it needs room to be written properly.
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

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

  // Revocation is chamber_admin-only server-side; mirror that here so a
  // staff_operator is never shown a button that will 403.
  const canRevoke =
    cert.status === 'issued' && ['super_admin', 'chamber_admin'].includes(role ?? '');
  const isRevoked = cert.status === 'revoked';
  // Offered to the applicant, not to staff viewing someone else's certificate.
  // If a replacement draft already exists the server 409s and the message is
  // surfaced — the certificate payload doesn't carry that fact to check here.
  const canResubmit = isRevoked && !isAdmin;

  const handleRevoke = async () => {
    setActionError(null);
    try {
      await revoke({ id: cert.id, reason: revokeReason.trim() }).unwrap();
      setRevokeOpen(false);
      setRevokeReason('');
      refetch();
    } catch (err: unknown) {
      const apiMsg = (err as { data?: { message?: string } })?.data?.message;
      setActionError(apiMsg ?? 'Failed to revoke the certificate. Please try again.');
    }
  };

  const handleResubmit = async () => {
    setActionError(null);
    try {
      const draft = await resubmit(cert.id).unwrap();
      // Straight into the prefilled draft — the applicant's next step is
      // correcting whatever was wrong, not looking at the revoked record again.
      // Same route the wizard already uses to edit any existing draft.
      navigate(`/dashboard/eco/apply/${draft.id}`);
    } catch (err: unknown) {
      const apiMsg = (err as { data?: { message?: string } })?.data?.message;
      setActionError(apiMsg ?? 'Could not start a replacement application. Please try again.');
    }
  };

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
          {isAdmin ? 'Certificate Queue' : 'Certificate Applications'}
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
      {/* Revoked certificates keep their PDF and number, so the notice has to
          carry the weight: without it a member sees a downloadable certificate
          and no indication it is no longer honoured. */}
      {isRevoked && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <strong>This certificate has been revoked</strong>
          {cert.revokedAt && <> on {fmtDate(cert.revokedAt)}</>}
          {' '}and is no longer valid. Anyone verifying it publicly will see it as revoked.
          {cert.revocationReason && (
            <div className="mt-1"><strong>Reason:</strong> {cert.revocationReason}</div>
          )}
          {canResubmit && (
            <div className="mt-1">You can correct the details and submit a replacement application below.</div>
          )}
        </div>
      )}
      {cert.resubmittedFromCertificateId && (
        <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
          This application replaces a revoked certificate.{' '}
          <Link
            to={`/dashboard/eco/${cert.resubmittedFromCertificateId}`}
            className="underline hover:no-underline"
          >
            View the revoked certificate
          </Link>
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
      {(reIssueErrorMsg || downloadError || actionError) && (
        <div className="mb-4">
          <ErrorBanner message={reIssueErrorMsg ?? downloadError ?? actionError ?? 'An error occurred.'} />
        </div>
      )}

      {/* Revocation panel — deliberately a form, not a confirm dialog. The
          reason is mandatory, quoted to the applicant verbatim in the
          notification email, and kept in the audit log. */}
      {revokeOpen && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50/50 px-4 py-4">
          <h2 className="text-sm font-semibold text-ink mb-1">Revoke this certificate</h2>
          <p className="text-xs text-ink-subtle mb-3">
            The certificate stays on record and remains publicly verifiable, but will show as
            revoked. The applicant is emailed this reason and can submit a corrected replacement.
            This cannot be undone.
          </p>
          <textarea
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Why is this certificate being revoked? The applicant will see this."
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:border-primary focus:outline-none"
          />
          <div className="mt-3 flex items-center gap-3">
            <Button
              loading={revoking}
              disabled={revokeReason.trim().length < 10}
              onClick={handleRevoke}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm revocation
            </Button>
            <Button
              variant="outline"
              onClick={() => { setRevokeOpen(false); setRevokeReason(''); setActionError(null); }}
            >
              Cancel
            </Button>
            {revokeReason.trim().length > 0 && revokeReason.trim().length < 10 && (
              <span className="text-xs text-ink-subtle">Give a reason of at least 10 characters.</span>
            )}
          </div>
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

        {/* Admin: revoke an issued certificate (RFP §4.1.12). chamber_admin and
            super_admin only — a chamber_executive is read-only and a
            staff_operator's authority stops at reviewing applications. */}
        {canRevoke && !isReadOnly && !revokeOpen && (
          <Button variant="outline" onClick={() => setRevokeOpen(true)} className="border-red-300 text-red-700 hover:bg-red-50">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14L21 3m-2 7v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6" />
            </svg>
            Revoke Certificate
          </Button>
        )}

        {/* Applicant: correct and resubmit after a revocation (RFP §4.1.12) */}
        {canResubmit && (
          <Button loading={resubmitting} onClick={handleResubmit} className="bg-primary hover:bg-primary-hover text-white">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Correct and Resubmit
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
          {/* Only for a USD invoice — shows the exact rate the Naira fee came
              from, so the number can be checked rather than just trusted
              (RFP §8.5, §6.4). Absent entirely for an NGN invoice, which had
              no conversion. */}
          {cert.fxRateUsed != null && (
            <Row
              label="USD → NGN Rate Used"
              value={
                <>
                  ₦{cert.fxRateUsed.toLocaleString()} per $1
                  {cert.invoiceTotalNgn != null && (
                    <span className="text-ink-subtle"> · invoice ≈ ₦{Math.round(cert.invoiceTotalNgn).toLocaleString()}</span>
                  )}
                  {cert.fxRateAt && (
                    <span className="text-ink-subtle"> · {fmtDate(cert.fxRateAt)}</span>
                  )}
                  {cert.fxRateSource && !cert.fxRateSource.startsWith('live:') && (
                    <span className="text-amber-700"> · fallback rate</span>
                  )}
                </>
              }
            />
          )}
          {isRevoked && <Row label="Revoked" value={fmtDate(cert.revokedAt)} />}
          {isRevoked && cert.revocationReason && (
            <Row label="Revocation Reason" value={cert.revocationReason} />
          )}
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
          {/* Was hardcoded to ₦ regardless of invoiceCurrency, so a USD invoice
              displayed as Naira at 1:1 — wrong by the whole exchange rate. */}
          <Row
            label="Invoice Total"
            value={
              cert.invoiceTotal != null
                ? `${cert.invoiceCurrency === 'USD' ? '$' : '₦'}${cert.invoiceTotal.toLocaleString()}`
                : null
            }
          />
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
          {/* The mode-specific transport document (RFP §4.1.7). Labelled from
              transportDocumentType, which records what was actually supplied —
              not recomputed from today's requirement rules, so a certificate
              submitted before a rule changed still reads correctly. */}
          {cert.transportDocumentKey && (
            <DocRow
              label={TRANSPORT_DOC_LABEL[cert.transportDocumentType ?? ''] ?? 'Transport Document'}
              certId={cert.id}
              docType="transport"
              attached
            />
          )}
        </div>
      </div>

      <Link to="/dashboard/eco" className="text-sm text-ink-subtle hover:text-primary">
        ← Back to {isAdmin ? 'queue' : 'all applications'}
      </Link>
    </div>
  );
}
