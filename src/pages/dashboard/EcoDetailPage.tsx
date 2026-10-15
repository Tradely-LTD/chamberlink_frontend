import type { ReactNode } from 'react';
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import {
  useGetEcoCertificateQuery,
  useGetCertificateTypesQuery,
  useReIssueCertificateMutation,
  useRevokeEcoCertMutation,
  useResubmitRevokedEcoCertMutation,
  useLazyGetEcoCertDownloadUrlQuery,
  useLazyGetEcoDocumentUrlQuery,
  type ECertStatus,
} from '@features/eco/ecoApi';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { PageHeader } from '@shared/ui/PageHeader';
import { StatusBadge, type StatusTone } from '@shared/ui/StatusBadge';
import { Button } from '@shared/ui/Button';

const statusTone: Record<ECertStatus, StatusTone> = {
  draft: 'neutral', submitted: 'info', under_review: 'warning', revision_requested: 'warning',
  approved: 'gold', pending_payment: 'gold', issued: 'success', rejected: 'danger', revoked: 'danger',
};

const statusLabel: Record<ECertStatus, string> = {
  draft: 'Draft', submitted: 'Submitted', under_review: 'Under review',
  pending_payment: 'Awaiting payment', approved: 'Approved, awaiting payment', issued: 'Issued',
  rejected: 'Rejected', revision_requested: 'Changes requested', revoked: 'Revoked',
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
  <div className="min-w-0 border-b border-border-subtle py-3 sm:[&:nth-last-child(-n+2):nth-child(odd)]:border-0 last:border-0">
    <dt className="text-xs text-ink-subtle">{label}</dt>
    <dd className="mt-0.5 break-words text-sm text-ink">{value ?? '–'}</dd>
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
    <div className="flex items-start py-3 border-b border-border last:border-0">
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
          {error && <span className="text-xs text-danger">{error}</span>}
        </span>
      ) : (
        <span className="text-sm text-ink font-medium">–</span>
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
  const { data: certificateTypes } = useGetCertificateTypesQuery();
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

  if (isLoading) return <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8"><SkeletonCard /></div>;
  if (isError || !cert) return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8">
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
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        breadcrumbs={[
          { label: isAdmin ? 'Certificate queue' : 'Certificate applications', to: '/dashboard/eco' },
          { label: cert.certificateNumber ?? 'Application' },
        ]}
        title={cert.certificateNumber ?? 'Certificate application'}
        description={[certificateTypes?.find((t) => t.code === cert.certificateTypeCode)?.name ?? 'Certificate of Origin', cert.solidMineralName, cert.destinationCountry && `to ${cert.destinationCountry}`].filter(Boolean).join(' · ')}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <aside className="order-first space-y-4 lg:order-last lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-card border border-border bg-surface p-5">
            <p className="text-2xs font-semibold uppercase text-ink-subtle">Status</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge tone={statusTone[cert.status]}>{statusLabel[cert.status]}</StatusBadge>
              {cert.issuedRetrospectively && <StatusBadge tone="warning">Issued retrospectively</StatusBadge>}
              {cert.membershipVerified && <StatusBadge tone="success">Membership verified</StatusBadge>}
            </div>
            <dl className="mt-4 space-y-2 border-t border-border-subtle pt-4 text-[13px]">
              <div className="flex justify-between gap-3"><dt className="text-ink-subtle">Applied</dt><dd className="num text-ink">{fmtDate(cert.createdAt)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-subtle">Issued</dt><dd className="num text-ink">{cert.issuedAt ? fmtDate(cert.issuedAt) : '–'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-subtle">Fee</dt><dd className="num font-medium text-ink">{cert.applicationFee ? `₦${cert.applicationFee.toLocaleString('en-NG', { maximumFractionDigits: 2 })}` : '–'}</dd></div>
            </dl>
          </section>

      {/* Status notices */}
      {cert.status === 'rejected' && cert.rejectionReason && (
        <div className="rounded-card border border-danger-border bg-danger-bg px-4 py-3 text-[13px] text-danger">
          <strong>Rejection reason:</strong> {cert.rejectionReason}
        </div>
      )}
      {cert.status === 'revision_requested' && cert.revisionNotes && (
        <div className="rounded-card border border-warning-border bg-warning-bg px-4 py-3 text-[13px] text-warning">
          <strong>Revision required:</strong> {cert.revisionNotes}
        </div>
      )}
      {cert.status === 'approved' && (
        <div className="rounded-card border border-warning-border bg-warning-bg px-4 py-3 text-[13px] text-warning">
          Approved. Payment is required before the certificate is issued.
        </div>
      )}
      {/* Revoked certificates keep their PDF and number, so the notice has to
          carry the weight: without it a member sees a downloadable certificate
          and no indication it is no longer honoured. */}
      {isRevoked && (
        <div className="rounded-card border border-danger-border bg-danger-bg px-4 py-3 text-[13px] text-danger">
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
        <div className="rounded-card border border-primary-200 bg-primary-soft px-4 py-3 text-[13px] text-primary">
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
        <div className="rounded-card border border-warning-border bg-warning-bg px-4 py-3 text-[13px] text-warning">
          The certificate PDF is missing or could not be retrieved (possible storage error).
          {isAdmin && !isReadOnly && (
            <span> Use the button below to re-generate it.</span>
          )}
        </div>
      )}
      {(reIssueErrorMsg || downloadError || actionError) && (
        <div>
          <ErrorBanner message={reIssueErrorMsg ?? downloadError ?? actionError ?? 'An error occurred.'} />
        </div>
      )}

      {/* Revocation panel — deliberately a form, not a confirm dialog. The
          reason is mandatory, quoted to the applicant verbatim in the
          notification email, and kept in the audit log. */}
      {revokeOpen && (
        <div className="rounded-card border border-danger-border bg-surface px-4 py-4">
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
            className="w-full px-2.5 py-2 rounded-control border border-border-input bg-surface text-sm text-ink placeholder:text-ink-subtle/80 outline-none transition-[border-color,box-shadow] duration-150 hover:border-ink-subtle focus:border-primary focus:shadow-focus disabled:bg-surface-alt disabled:cursor-not-allowed"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              loading={revoking}
              disabled={revokeReason.trim().length < 10}
              onClick={handleRevoke}
              variant="danger"
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
      <div className="flex flex-col gap-2 [&>button]:w-full">
        {/* Download — fetches a fresh signed URL from server */}
        {hasPdf && (
          <Button
            loading={downloadLoading}
            onClick={() => openSignedUrl('download')}
          >
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>download</span>
            Download certificate
          </Button>
        )}

        {/* Print — opens PDF in new tab via signed URL (user prints from browser) */}
        {hasPdf && (
          <Button variant="outline" loading={downloadLoading} onClick={() => openSignedUrl('print')}>
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>print</span>Print
          </Button>
        )}

        {/* Admin: revoke an issued certificate (RFP §4.1.12). chamber_admin and
            super_admin only — a chamber_executive is read-only and a
            staff_operator's authority stops at reviewing applications. */}
        {canRevoke && !isReadOnly && !revokeOpen && (
          <Button variant="danger" onClick={() => setRevokeOpen(true)}>
            Revoke certificate
          </Button>
        )}

        {/* Applicant: correct and resubmit after a revocation (RFP §4.1.12) */}
        {canResubmit && (
          <Button loading={resubmitting} onClick={handleResubmit}>
            Correct and resubmit
          </Button>
        )}

        {/* Admin: re-generate PDF for issued certs missing a document (genuine failure) */}
        {isAdmin && !isReadOnly && isIssuedMissingDoc && (
          <Button loading={reIssuing} onClick={handleReIssue}>
            Re-generate certificate
          </Button>
        )}

        {/* Admin: re-issue replacement copy */}
        {isAdmin && !isReadOnly && isIssued && hasPdf && (
          <Button variant="outline" loading={reIssuing} onClick={handleReIssue}>
            Re-issue a replacement copy
          </Button>
        )}
      </div>

        </aside>

        <div className="min-w-0 space-y-4">
      {/* Certificate Info */}
      <div className="bg-surface rounded-card border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-surface-alt">
          <h2 className="text-2xs font-semibold text-ink-subtle uppercase">Certificate Info</h2>
        </div>
        <dl className="grid px-5 sm:grid-cols-2 sm:gap-x-8">
          <Row label="Certificate #" value={cert.certificateNumber ?? '–'} />
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
                    <span className="text-warning"> · fallback rate</span>
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
          <Row label="Self-Declared Chamber Member" value={cert.selfDeclaredIsMember ? `Yes (${cert.selfDeclaredMembershipId ?? '–'})` : 'No'} />
          {cert.paymentRef && <Row label="Payment Ref" value={<span className="font-mono text-xs">{cert.paymentRef}</span>} />}
        </dl>
      </div>

      {/* Product/Goods Details */}
      <div className="bg-surface rounded-card border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-surface-alt">
          <h2 className="text-2xs font-semibold text-ink-subtle uppercase">Product / Goods Details</h2>
        </div>
        <dl className="grid px-5 sm:grid-cols-2 sm:gap-x-8">
          <Row label="Solid Mineral" value={cert.solidMineralName} />
          <Row label="HS Code" value={cert.hsCode} />
          <Row label="Description of Goods" value={cert.descriptionOfGoods} />
          <Row label="Number & Kind of Packages" value={cert.numberAndKindOfPackages} />
          <Row label="Marks and Numbers" value={cert.marksAndNumbers} />
          <Row label="Quantity" value={cert.quantity != null ? `${cert.quantity} ${cert.quantityUnit ?? ''}` : null} />
          <Row label="Origin of goods" value={cert.originStates?.length ? [cert.originLga && `${cert.originLga} LGA`, ...cert.originStates].filter(Boolean).join(', ') : null} />
          <Row label="Destination Country" value={cert.destinationCountry} />
          <Row label="Destination Port" value={cert.destinationPort} />
          <Row label="Batch/ID No." value={cert.batchIdNo} />
        </dl>
      </div>

      {/* Exporter/Company Details */}
      <div className="bg-surface rounded-card border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-surface-alt">
          <h2 className="text-2xs font-semibold text-ink-subtle uppercase">Exporter / Company Details</h2>
        </div>
        <dl className="grid px-5 sm:grid-cols-2 sm:gap-x-8">
          <Row label="License Owner" value={cert.isLicenseOwner ? `Yes (${cert.miningLicenseNo ?? '–'})` : 'No'} />
          <Row label="Company Name" value={cert.companyName} />
          <Row label="Company Address" value={cert.companyAddress} />
          <Row label="Company Country" value={cert.companyCountry} />
          <Row label="Company Email" value={cert.companyEmail} />
          <Row label="Company Phone" value={cert.companyPhone} />
        </dl>
      </div>

      {/* Consignee Details */}
      <div className="bg-surface rounded-card border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-surface-alt">
          <h2 className="text-2xs font-semibold text-ink-subtle uppercase">Consignee Details</h2>
        </div>
        <dl className="grid px-5 sm:grid-cols-2 sm:gap-x-8">
          <Row label="Consignee Name" value={cert.consigneeName} />
          <Row label="Consignee Address" value={cert.consigneeAddress} />
        </dl>
      </div>

      {/* Shipment & Transport */}
      <div className="bg-surface rounded-card border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-surface-alt">
          <h2 className="text-2xs font-semibold text-ink-subtle uppercase">Shipment & Transport</h2>
        </div>
        <dl className="grid px-5 sm:grid-cols-2 sm:gap-x-8">
          <Row label="Departure Date" value={cert.departureDate} />
          <Row label="Means of Transport" value={cert.meansOfTransport ? (MEANS_OF_TRANSPORT_LABEL[cert.meansOfTransport] ?? cert.meansOfTransport) : null} />
          <Row label="Vessel/Flight/Vehicle & Voyage No." value={cert.vesselFlightVehicleNameVoyageNo} />
          <Row label="Port of Loading" value={cert.portOfLoading} />
          <Row label="Port of Discharge" value={cert.portOfDischarge} />
        </dl>
      </div>

      {/* Commercial Information */}
      <div className="bg-surface rounded-card border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-surface-alt">
          <h2 className="text-2xs font-semibold text-ink-subtle uppercase">Commercial Information</h2>
        </div>
        <dl className="grid px-5 sm:grid-cols-2 sm:gap-x-8">
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
        </dl>
      </div>

      {/* Compliance / Declaration docs */}
      <div className="bg-surface rounded-card border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-surface-alt">
          <h2 className="text-2xs font-semibold text-ink-subtle uppercase">Compliance / Declaration Documents</h2>
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

        </div>
      </div>
    </div>
  );
}
