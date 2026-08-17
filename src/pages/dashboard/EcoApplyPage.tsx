import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  useCreateEcoCertificateMutation,
  useCreateEcoCertificateWithFilesMutation,
  useSaveDraftEcoMutation,
  useUpdateEcoDraftMutation,
  useSubmitEcoDraftMutation,
  useGetEcoCertificateQuery,
  useGetSolidMineralsQuery,
  useGetOnboardedTenantsQuery,
} from '@features/eco/ecoApi';
import type { NewECertPayload } from '@features/eco/ecoApi';
import { useGetDocumentsQuery, useUploadDocumentMutation } from '@features/documents';
import type { DocumentCategory } from '@features/documents';
import { useHasChamberConnection } from '@features/membership';
import { NIGERIAN_STATES } from '@shared/constants/nigerianStates';
import { Input } from '@shared/ui/Input';
import { Select } from '@shared/ui/Select';
import { Textarea } from '@shared/ui/Textarea';
import { Button } from '@shared/ui/Button';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { Card } from '@shared/ui/Card';

const STEPS = [
  'Product & Goods',
  'Exporter & Consignee',
  'Shipment & Transport',
  'Commercial Information',
  'Compliance Documents',
  'Review & Submit',
];

const MEANS_OF_TRANSPORT: { label: string; value: NewECertPayload['meansOfTransport'] }[] = [
  { label: 'Sea', value: 'sea' },
  { label: 'Air', value: 'air' },
  { label: 'Land', value: 'land' },
];

const UNKNOWN_VALUE = '***';

// Preview-only — matches the backend's default USD_TO_NGN_RATE (chamberlink_backend
// config/env.ts). The real conversion happens server-side using the currently
// configured rate; this is just so the applicant sees a ballpark fee.
const APPROX_USD_TO_NGN_RATE = 1400;

// Mirrors the backend's zod constraints (submitECertSchema) so the form catches
// the same problems before submit instead of round-tripping to the API to find
// out a field was too short. Only fires once a value is present — emptiness is
// already handled by the "* required" + disabled-Continue convention.
const minLenError = (value: string, min: number, label: string): string | undefined =>
  value !== '' && value.trim().length < min
    ? `${label} must be at least ${min} character${min === 1 ? '' : 's'}.`
    : undefined;

const emailFormatError = (value: string): string | undefined =>
  value !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ? 'Enter a valid email address.'
    : undefined;

const positiveNumberError = (value: string, label: string): string | undefined =>
  value !== '' && Number(value) <= 0 ? `${label} must be greater than zero.` : undefined;

type SupportingDocMode = 'library' | 'upload';

// "Upload New" behavior depends on whether this applicant has a chamber
// connection:
//  - Connected member: uploads immediately to their document library (POST
//    /membership/me/documents — same endpoint "From Library" reads from) and
//    hands the parent a docId. Reusable across applications, no re-upload on
//    every draft save/submit retry.
//  - Zero-connection GUEST applicant: the document-library endpoint requires
//    an active chamber connection server-side and 404s for a guest, so there
//    is no library to upload into (and "From Library" would always be empty
//    for them anyway — hidden entirely). Instead the raw File is held in
//    local state and handed to the parent via onSelectFile, to be attached
//    directly to the eCO create/draft/submit request as multipart/form-data
//    — exactly the guest/non-member CoO path this module exists to serve.
function DocSlot({ label, filterCategory, selectedDocId, onSelectDocId, selectedFile, onSelectFile, hasConnection }: {
  label: string; filterCategory: DocumentCategory;
  selectedDocId: string | null;
  onSelectDocId: (id: string | null) => void;
  selectedFile: File | null;
  onSelectFile: (file: File | null) => void;
  hasConnection: boolean;
}) {
  const { data: allDocs = [] } = useGetDocumentsQuery(undefined, { skip: !hasConnection });
  const [uploadDocument, { isLoading: isUploading }] = useUploadDocumentMutation();
  const [mode, setMode] = useState<SupportingDocMode>(hasConnection ? 'library' : 'upload');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const matchingDocs = allDocs.filter((d) => d.category === filterCategory);
  const selectedDoc = allDocs.find((d) => d.id === selectedDocId);
  const isFilled = !!selectedDocId || !!selectedFile;

  const handleFileSelected = async (file: File | null) => {
    if (!file) return;
    setUploadError(null);
    if (!hasConnection) {
      onSelectFile(file);
      return;
    }
    try {
      const fd = new FormData();
      fd.append('document', file);
      fd.append('category', filterCategory);
      const doc = await uploadDocument(fd).unwrap();
      onSelectDocId(doc.id);
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    onSelectDocId(null);
    onSelectFile(null);
  };

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-4 py-3 bg-surface-alt border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`material-symbols-outlined flex-shrink-0 ${isFilled ? 'text-success' : 'text-ink-subtle'}`}
            style={{ fontSize: 18, fontVariationSettings: `'FILL' ${isFilled ? 1 : 0}` }}
          >
            {isFilled ? 'check_circle' : 'radio_button_unchecked'}
          </span>
          <p className="text-sm font-medium text-ink truncate">{label}</p>
        </div>
        {/* No library to switch to for a zero-connection guest applicant — see comment above. */}
        {hasConnection && (
          <div className="flex items-center gap-1 bg-surface rounded-lg border border-border p-0.5 flex-shrink-0">
            {(['library', 'upload'] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setUploadError(null); onSelectDocId(null); }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${mode === m ? 'bg-primary text-white' : 'text-ink-subtle hover:text-ink'}`}>
                {m === 'library' ? 'From Library' : 'Upload New'}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="p-4">
        {mode === 'library' ? (
          matchingDocs.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-border-strong px-4 py-6 text-center">
              <span className="material-symbols-outlined text-ink-subtle mb-1" style={{ fontSize: 22 }} aria-hidden="true">folder_off</span>
              <p className="text-sm text-ink-subtle">No {label.toLowerCase()} in your library.</p>
              <button onClick={() => setMode('upload')} className="mt-2 text-xs text-primary hover:underline font-medium">Upload one now</button>
            </div>
          ) : (
            <div className="space-y-2">
              {matchingDocs.map((doc) => (
                <label key={doc.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedDocId === doc.id ? 'border-primary bg-success-bg' : 'border-border hover:border-primary/40'}`}>
                  <input type="radio" name={`doc-${filterCategory}`} value={doc.id} checked={selectedDocId === doc.id} onChange={() => onSelectDocId(doc.id)} className="text-primary focus:ring-primary/30" />
                  <span className="material-symbols-outlined text-ink-subtle flex-shrink-0" style={{ fontSize: 20 }} aria-hidden="true">description</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">{doc.name}</p>
                    <p className="text-xs text-ink-subtle">{new Date(doc.uploadedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  {selectedDocId === doc.id && <span className="material-symbols-outlined text-success flex-shrink-0" style={{ fontSize: 18 }} aria-hidden="true">check_circle</span>}
                </label>
              ))}
              {selectedDocId && <button onClick={() => onSelectDocId(null)} className="text-xs text-ink-subtle hover:text-ink">Clear selection</button>}
            </div>
          )
        ) : (
          <div>
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
              onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)} />
            {uploadError && <p className="text-xs text-danger mb-2">{uploadError}</p>}
            {isUploading ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border-strong px-4 py-6">
                <span className="material-symbols-outlined animate-spin text-ink-subtle" style={{ fontSize: 20 }} aria-hidden="true">progress_activity</span>
                <p className="text-sm text-ink-subtle">Uploading…</p>
              </div>
            ) : (selectedDocId || selectedFile) ? (
              <div className="flex items-center gap-3 rounded-lg border border-primary bg-success-bg p-3">
                <span className="material-symbols-outlined text-success flex-shrink-0" style={{ fontSize: 24 }} aria-hidden="true">description</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate">{selectedFile?.name ?? selectedDoc?.name ?? 'Uploaded file'}</p>
                  <p className="text-xs text-ink-subtle">{selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB` : 'Uploaded'}</p>
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs font-medium text-primary hover:underline flex-shrink-0">Replace</button>
                <button type="button" onClick={handleRemove} className="text-ink-subtle hover:text-danger flex-shrink-0" aria-label="Remove file">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-lg border-2 border-dashed border-border-strong px-4 py-6 text-center hover:border-primary hover:bg-primary/5 transition-colors">
                <span className="material-symbols-outlined text-ink-subtle mb-1" style={{ fontSize: 24 }} aria-hidden="true">upload_file</span>
                <p className="text-sm text-ink-subtle">{hasConnection ? 'Attach or select from library' : 'Attach a file'}</p>
                <p className="text-xs text-ink-subtle mt-0.5">PDF, JPEG, PNG · Max 10MB</p>
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function ReviewSection({ title, onEdit, rows }: {
  title: string;
  onEdit: () => void;
  rows: { label: string; value: string }[];
}) {
  return (
    <Card padding="none">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">{title}</h3>
        <button onClick={onEdit} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }} aria-hidden="true">edit</span>
          Edit
        </button>
      </div>
      <dl className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-3 gap-4 px-4 py-3">
            <dt className="text-sm text-ink-subtle">{row.label}</dt>
            <dd className="col-span-2 text-sm text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

const selectClass = 'w-full rounded-lg border border-border/60 px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';
const labelClass = 'block text-sm font-medium text-ink mb-1.5';

interface FormState {
  tenantId: string;
  solidMineralId: string;
  descriptionOfGoods: string;
  numberAndKindOfPackages: string;
  marksAndNumbers: string;
  quantity: string;
  quantityUnit: 'KG' | 'MT';
  originStates: string[];
  destinationCountry: string;
  destinationPort: string;
  batchIdNo: string;
  isLicenseOwner: boolean;
  miningLicenseNo: string;
  companyName: string;
  companyAddress: string;
  companyCountry: string;
  companyEmail: string;
  companyPhone: string;
  consigneeName: string;
  consigneeAddress: string;
  departureDate: string;
  meansOfTransport: NonNullable<NewECertPayload['meansOfTransport']>;
  vesselFlightVehicleNameVoyageNo: string;
  portOfLoading: string;
  portOfDischarge: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceTotal: string;
  invoiceCurrency: 'NGN' | 'USD';
  customerOrderOrLcNo: string;
  selfDeclaredIsMember: boolean;
  selfDeclaredMembershipId: string;
}

const initialForm: FormState = {
  tenantId: '', solidMineralId: '', descriptionOfGoods: '', numberAndKindOfPackages: '', marksAndNumbers: '',
  quantity: '', quantityUnit: 'KG', originStates: [], destinationCountry: '', destinationPort: '', batchIdNo: '',
  isLicenseOwner: false, miningLicenseNo: '',
  companyName: '', companyAddress: '', companyCountry: 'Nigeria', companyEmail: '', companyPhone: '',
  consigneeName: '', consigneeAddress: '',
  departureDate: '', meansOfTransport: 'sea', vesselFlightVehicleNameVoyageNo: '', portOfLoading: '', portOfDischarge: '',
  invoiceNumber: '', invoiceDate: '', invoiceTotal: '', invoiceCurrency: 'NGN', customerOrderOrLcNo: '',
  selfDeclaredIsMember: false, selfDeclaredMembershipId: '',
};

export function EcoApplyPage() {
  const navigate = useNavigate();
  const { certId } = useParams<{ certId?: string }>();
  const isEditing = !!certId;

  const { data: existingCert } = useGetEcoCertificateQuery(certId ?? '', { skip: !certId });
  const { data: solidMinerals = [] } = useGetSolidMineralsQuery();
  const { data: onboardedTenants = [] } = useGetOnboardedTenantsQuery();

  const [createEco, { isLoading: isCreating }] = useCreateEcoCertificateMutation();
  const [createEcoWithFiles, { isLoading: isCreatingWithFiles }] = useCreateEcoCertificateWithFilesMutation();
  const [saveDraftEco, { isLoading: isSavingDraft }] = useSaveDraftEcoMutation();
  const [updateDraft, { isLoading: isUpdating }] = useUpdateEcoDraftMutation();
  const [submitDraft, { isLoading: isSubmitting }] = useSubmitEcoDraftMutation();
  const { hasConnection } = useHasChamberConnection();
  const { data: myDocs = [] } = useGetDocumentsQuery(undefined, { skip: !hasConnection });

  const isLoading = isCreating || isCreatingWithFiles || isSubmitting;
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(certId ?? null);

  const [form, setForm] = useState<FormState>(initialForm);

  // "I don't know yet" toggles for shipment subfields that accept the literal "***"
  const [departureUnknown, setDepartureUnknown] = useState(false);
  const [vesselUnknown, setVesselUnknown] = useState(false);
  const [loadingPortUnknown, setLoadingPortUnknown] = useState(false);
  const [dischargePortUnknown, setDischargePortUnknown] = useState(false);

  const [invoiceDocId, setInvoiceDocId] = useState<string | null>(null);
  const [signatureDocId, setSignatureDocId] = useState<string | null>(null);
  const [cacCertificateDocId, setCacCertificateDocId] = useState<string | null>(null);
  const [nepcCertificateDocId, setNepcCertificateDocId] = useState<string | null>(null);

  // Populated only for a zero-connection guest applicant (see DocSlot) —
  // attached directly to the request as multipart/form-data instead of a
  // docId reference, since they have no document library to upload into.
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [cacCertificateFile, setCacCertificateFile] = useState<File | null>(null);
  const [nepcCertificateFile, setNepcCertificateFile] = useState<File | null>(null);

  const chamberLocked = !!existingCert && existingCert.status !== 'draft';

  // Pre-populate form when editing existing draft/revision_requested
  useEffect(() => {
    if (!existingCert) return;
    setForm({
      tenantId: existingCert.tenantId ?? '',
      solidMineralId: existingCert.solidMineralId ?? '',
      descriptionOfGoods: existingCert.descriptionOfGoods ?? '',
      numberAndKindOfPackages: existingCert.numberAndKindOfPackages ?? '',
      marksAndNumbers: existingCert.marksAndNumbers ?? '',
      quantity: existingCert.quantity != null ? String(existingCert.quantity) : '',
      quantityUnit: existingCert.quantityUnit ?? 'KG',
      originStates: existingCert.originStates ?? [],
      destinationCountry: existingCert.destinationCountry ?? '',
      destinationPort: existingCert.destinationPort ?? '',
      batchIdNo: existingCert.batchIdNo ?? '',
      isLicenseOwner: existingCert.isLicenseOwner ?? false,
      miningLicenseNo: existingCert.miningLicenseNo ?? '',
      companyName: existingCert.companyName ?? '',
      companyAddress: existingCert.companyAddress ?? '',
      companyCountry: existingCert.companyCountry ?? 'Nigeria',
      companyEmail: existingCert.companyEmail ?? '',
      companyPhone: existingCert.companyPhone ?? '',
      consigneeName: existingCert.consigneeName ?? '',
      consigneeAddress: existingCert.consigneeAddress ?? '',
      departureDate: existingCert.departureDate ?? '',
      meansOfTransport: existingCert.meansOfTransport ?? 'sea',
      vesselFlightVehicleNameVoyageNo: existingCert.vesselFlightVehicleNameVoyageNo ?? '',
      portOfLoading: existingCert.portOfLoading ?? '',
      portOfDischarge: existingCert.portOfDischarge ?? '',
      invoiceNumber: existingCert.invoiceNumber ?? '',
      invoiceDate: existingCert.invoiceDate ?? '',
      invoiceTotal: existingCert.invoiceTotal != null ? String(existingCert.invoiceTotal) : '',
      invoiceCurrency: existingCert.invoiceCurrency ?? 'NGN',
      customerOrderOrLcNo: existingCert.customerOrderOrLcNo ?? '',
      selfDeclaredIsMember: existingCert.selfDeclaredIsMember ?? false,
      selfDeclaredMembershipId: existingCert.selfDeclaredMembershipId ?? '',
    });
    setDepartureUnknown(existingCert.departureDate === UNKNOWN_VALUE);
    setVesselUnknown(existingCert.vesselFlightVehicleNameVoyageNo === UNKNOWN_VALUE);
    setLoadingPortUnknown(existingCert.portOfLoading === UNKNOWN_VALUE);
    setDischargePortUnknown(existingCert.portOfDischarge === UNKNOWN_VALUE);
  }, [existingCert]);

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const setUnknown = (
    field: 'departureDate' | 'vesselFlightVehicleNameVoyageNo' | 'portOfLoading' | 'portOfDischarge',
    setter: (v: boolean) => void,
    checked: boolean,
  ) => {
    setter(checked);
    set(field, checked ? UNKNOWN_VALUE : '');
  };

  const selectedMineral = solidMinerals.find((m) => m.id === form.solidMineralId);

  // Field-level errors, mirroring submitECertSchema's min-length/format rules.
  const errors = {
    descriptionOfGoods: minLenError(form.descriptionOfGoods, 5, 'Description of Goods'),
    quantity: positiveNumberError(form.quantity, 'Quantity'),
    destinationCountry: minLenError(form.destinationCountry, 2, 'Destination Country'),
    companyName: minLenError(form.companyName, 2, 'Company Name'),
    companyAddress: minLenError(form.companyAddress, 5, 'Company Address'),
    companyEmail: emailFormatError(form.companyEmail),
    companyPhone: minLenError(form.companyPhone, 5, 'Company Phone'),
    consigneeName: minLenError(form.consigneeName, 2, 'Consignee Full Legal Name'),
    consigneeAddress: minLenError(form.consigneeAddress, 5, 'Consignee Address'),
    invoiceTotal: positiveNumberError(form.invoiceTotal, 'Invoice Total'),
  };

  // Compliance documents are attached by reference (invoiceDocId etc.) for a
  // connected member — DocSlot uploads new files to their document library
  // up front and hands back an id, keeping the eCO request body plain JSON.
  // A zero-connection GUEST applicant has no document library to upload
  // into, so any raw File they attached (invoiceFile etc.) is sent directly
  // on THIS SAME request as multipart/form-data instead — the backend's
  // ecoUpload middleware accepts either shape on the same routes.
  const buildJsonBody = (): Partial<NewECertPayload> => ({
    solidMineralId: form.solidMineralId || undefined,
    descriptionOfGoods: form.descriptionOfGoods || undefined,
    numberAndKindOfPackages: form.numberAndKindOfPackages || undefined,
    marksAndNumbers: form.marksAndNumbers || undefined,
    quantity: form.quantity ? Number(form.quantity) : undefined,
    quantityUnit: form.quantityUnit,
    originStates: form.originStates.length ? form.originStates : undefined,
    destinationCountry: form.destinationCountry || undefined,
    destinationPort: form.destinationPort || undefined,
    batchIdNo: form.batchIdNo || undefined,
    isLicenseOwner: form.isLicenseOwner,
    miningLicenseNo: form.isLicenseOwner ? (form.miningLicenseNo || undefined) : undefined,
    companyName: form.companyName || undefined,
    companyAddress: form.companyAddress || undefined,
    companyCountry: form.companyCountry || undefined,
    companyEmail: form.companyEmail || undefined,
    companyPhone: form.companyPhone || undefined,
    consigneeName: form.consigneeName || undefined,
    consigneeAddress: form.consigneeAddress || undefined,
    departureDate: form.departureDate || undefined,
    meansOfTransport: form.meansOfTransport,
    vesselFlightVehicleNameVoyageNo: form.vesselFlightVehicleNameVoyageNo || undefined,
    portOfLoading: form.portOfLoading || undefined,
    portOfDischarge: form.portOfDischarge || undefined,
    invoiceNumber: form.invoiceNumber || undefined,
    invoiceDate: form.invoiceDate || undefined,
    invoiceTotal: form.invoiceTotal ? Number(form.invoiceTotal) : undefined,
    invoiceCurrency: form.invoiceCurrency,
    customerOrderOrLcNo: form.customerOrderOrLcNo || undefined,
    tenantId: form.tenantId || undefined,
    selfDeclaredIsMember: form.selfDeclaredIsMember,
    selfDeclaredMembershipId: form.selfDeclaredIsMember ? (form.selfDeclaredMembershipId || undefined) : undefined,
    invoiceDocId: invoiceDocId ?? undefined,
    signatureDocId: signatureDocId ?? undefined,
    cacCertificateDocId: cacCertificateDocId ?? undefined,
    nepcCertificateDocId: nepcCertificateDocId ?? undefined,
  });

  const hasRawFiles = !!(invoiceFile || signatureFile || cacCertificateFile || nepcCertificateFile);

  const buildFormDataOrJson = (): { isFormData: false; body: Partial<NewECertPayload> } | { isFormData: true; body: FormData } => {
    const jsonBody = buildJsonBody();
    if (!hasRawFiles) return { isFormData: false, body: jsonBody };

    const fd = new FormData();
    const append = (k: string, v: string | boolean | number | undefined) => { if (v !== undefined && v !== '') fd.append(k, String(v)); };
    for (const [key, value] of Object.entries(jsonBody)) {
      if (value === undefined) continue;
      if (key === 'originStates') { fd.append('originStates', JSON.stringify(value)); continue; }
      append(key, value as string | boolean | number);
    }
    if (invoiceFile) fd.append('invoice', invoiceFile);
    if (signatureFile) fd.append('signature', signatureFile);
    if (cacCertificateFile) fd.append('cacCertificate', cacCertificateFile);
    if (nepcCertificateFile) fd.append('nepcCertificate', nepcCertificateFile);
    return { isFormData: true, body: fd };
  };

  const handleSaveDraft = async () => {
    setError(null);
    try {
      const { isFormData, body } = buildFormDataOrJson();
      if (currentDraftId) {
        const res = await updateDraft({ certId: currentDraftId, body: isFormData ? body : body }).unwrap();
        setCurrentDraftId(res.id);
      } else {
        const res = await saveDraftEco(isFormData ? body : body).unwrap();
        setCurrentDraftId(res.id);
      }
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 3000);
    } catch {
      setError('Failed to save draft. Please try again.');
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (form.invoiceTotal && Number(form.invoiceTotal) <= 0) {
      setError('Invoice Total must be greater than zero.');
      return;
    }
    if (!canContinueStep4) {
      setError('Invoice, Signature, CAC Certificate, and NEPC Certificate are all required to submit.');
      return;
    }
    const { isFormData, body } = buildFormDataOrJson();
    try {
      if (currentDraftId) {
        await submitDraft({ certId: currentDraftId, body: isFormData ? body : body as NewECertPayload }).unwrap();
      } else if (isFormData) {
        await createEcoWithFiles(body).unwrap();
      } else {
        await createEco(body as NewECertPayload).unwrap();
      }
      navigate('/dashboard/eco');
    } catch {
      setError('Failed to submit application. Please try again.');
    }
  };

  const isRevisionRequested = existingCert?.status === 'revision_requested';

  const canContinueStep0 = !!(
    form.tenantId && form.solidMineralId && form.descriptionOfGoods && form.numberAndKindOfPackages
    && form.quantity && form.originStates.length > 0 && form.destinationCountry
    && !errors.descriptionOfGoods && !errors.quantity && !errors.destinationCountry
  );
  const canContinueStep1 = !!(
    form.companyName && form.companyAddress && form.companyCountry && form.companyEmail && form.companyPhone
    && form.consigneeName && form.consigneeAddress
    && (!form.isLicenseOwner || form.miningLicenseNo)
    && (!form.selfDeclaredIsMember || form.selfDeclaredMembershipId)
    && !errors.companyName && !errors.companyAddress && !errors.companyEmail && !errors.companyPhone
    && !errors.consigneeName && !errors.consigneeAddress
  );
  const canContinueStep2 = !!(
    form.departureDate && form.meansOfTransport && form.vesselFlightVehicleNameVoyageNo
    && form.portOfLoading && form.portOfDischarge
  );
  const canContinueStep3 = !!(form.invoiceDate && form.invoiceTotal && Number(form.invoiceTotal) > 0);
  // All four documents are compulsory — an existing draft's already-saved key
  // (invoiceFileKey etc. via existingCert) also counts, not just a docId/file
  // picked in this session. A raw File (guest applicant, no docId) counts too.
  const canContinueStep4 = !!(
    (invoiceDocId || invoiceFile || existingCert?.invoiceFileKey)
    && (signatureDocId || signatureFile || existingCert?.signatureKey)
    && (cacCertificateDocId || cacCertificateFile || existingCert?.cacCertificateKey)
    && (nepcCertificateDocId || nepcCertificateFile || existingCert?.nepcCertificateKey)
  );

  const canContinue = [canContinueStep0, canContinueStep1, canContinueStep2, canContinueStep3, canContinueStep4, true];

  // Fee is always charged in NGN — for a USD invoice this is a rough preview only
  // (matches the backend's default USD_TO_NGN_RATE; the reviewer's server-side
  // conversion at approval time is the number that actually gets charged).
  const feeEstimateNgnTotal = form.invoiceTotal
    ? Number(form.invoiceTotal) * (form.invoiceCurrency === 'USD' ? APPROX_USD_TO_NGN_RATE : 1)
    : 0;
  const feeEstimate = form.invoiceTotal
    ? {
      verified: feeEstimateNgnTotal * 0.0011,
      unverified: feeEstimateNgnTotal * 0.00125,
    }
    : null;

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/dashboard/eco" className="text-sm text-ink-subtle hover:text-ink">eCO Certificates</Link>
        <span className="text-ink-subtle">/</span>
        <span className="text-sm text-ink">{isEditing ? 'Edit Application' : 'New Application'}</span>
      </div>

      <h1 className="text-2xl font-semibold text-ink mb-1">
        {isRevisionRequested ? 'Resubmit Application' : isEditing ? 'Continue Draft' : 'Apply for Certificate of Origin'}
      </h1>
      <p className="text-sm text-ink-subtle mb-2">Complete all required fields to submit your eCO application.</p>

      {isRevisionRequested && existingCert?.revisionNotes && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold mb-1">Admin revision notes:</p>
          <p>{existingCert.revisionNotes}</p>
        </div>
      )}

      {draftSaved && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
          Draft saved — you can close this page and continue later.
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8 overflow-x-auto">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 transition-colors ${i <= step ? 'bg-primary text-white shadow-sm' : 'bg-surface-alt text-ink-subtle border border-border'}`}>
                {i < step ? <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span> : i + 1}
              </div>
              <span className={`text-xs mt-1.5 whitespace-nowrap ${i === step ? 'text-primary font-semibold' : 'text-ink-subtle'}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 mx-2 mb-6 min-w-[16px] border-t-2 rounded-full ${i < step ? 'border-primary' : 'border-border'}`} />}
          </div>
        ))}
      </div>

      {error && <ErrorBanner message={error} />}

      <Card>
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-medium text-ink mb-4">Product & Goods Details</h2>

            <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide">Chamber & Mineral</p>
            <div>
              {chamberLocked ? (
                <>
                  <label className={labelClass}>From which Chamber of Commerce? *</label>
                  <input
                    disabled
                    value={onboardedTenants.find((t) => t.id === form.tenantId)?.name ?? form.tenantId}
                    className={`${selectClass} bg-surface-alt text-ink-subtle cursor-not-allowed`}
                  />
                  <p className="text-xs text-ink-subtle mt-1">Locked after first submission.</p>
                </>
              ) : (
                <Select label="From which Chamber of Commerce? *" value={form.tenantId} onValueChange={(v) => set('tenantId', v)}
                  placeholder="Select a chamber…"
                  options={onboardedTenants.map((t) => ({ value: t.id, label: `${t.name}${t.city ? ` — ${t.city}` : ''}` }))} />
              )}
            </div>

            <div>
              <Select label="Solid Mineral *" value={form.solidMineralId} onValueChange={(v) => set('solidMineralId', v)}
                placeholder="Select a mineral…"
                options={solidMinerals.map((m) => ({ value: m.id, label: m.name }))} />
              {selectedMineral && (
                <div className="mt-1.5">
                  <label className="block text-xs text-ink-subtle mb-0.5">HS Code (auto-derived)</label>
                  <input readOnly disabled value={selectedMineral.hsCode} className={`${selectClass} bg-surface-alt text-ink-subtle cursor-not-allowed`} />
                </div>
              )}
            </div>

            <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide pt-2">Goods Details</p>
            <Textarea label="Description of Goods *" rows={3} placeholder="Describe the goods being exported"
              value={form.descriptionOfGoods} onChange={(e) => set('descriptionOfGoods', e.target.value)} error={errors.descriptionOfGoods} />

            <Input label="Number and Kind of Packages *" placeholder="e.g. 50 sacks" value={form.numberAndKindOfPackages}
              onChange={(e) => set('numberAndKindOfPackages', e.target.value)} />
            <Input label="Marks and Numbers" placeholder="Optional shipping marks" value={form.marksAndNumbers}
              onChange={(e) => set('marksAndNumbers', e.target.value)} />

            <div className="grid grid-cols-2 gap-3">
              <Input label="Quantity *" type="number" placeholder="e.g. 1000" value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)} error={errors.quantity} />
              <Select label="Unit *" value={form.quantityUnit} onValueChange={(v) => set('quantityUnit', v as 'KG' | 'MT')}
                options={[{ value: 'KG', label: 'KG' }, { value: 'MT', label: 'MT' }]} />
            </div>

            <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide pt-2">Origin & Destination</p>

            <Select label="Origin of Goods (Nigerian State) *" value={form.originStates[0] ?? ''}
              onValueChange={(v) => set('originStates', v ? [v] : [])}
              placeholder="Select a state…"
              options={NIGERIAN_STATES.map((s) => ({ value: s, label: s }))} />

            <Input label="Destination Country *" placeholder="e.g. United Arab Emirates" value={form.destinationCountry}
              onChange={(e) => set('destinationCountry', e.target.value)} error={errors.destinationCountry} />
            <Input label="Destination Port" placeholder="Optional" value={form.destinationPort}
              onChange={(e) => set('destinationPort', e.target.value)} />
            <Input label="Batch/ID No." placeholder="Optional" value={form.batchIdNo}
              onChange={(e) => set('batchIdNo', e.target.value)} />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-medium text-ink mb-4">Exporter/Company & Consignee Details</h2>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.isLicenseOwner} onChange={(e) => set('isLicenseOwner', e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30" />
              <span className="text-sm text-ink">I am the mining license owner</span>
            </label>
            {form.isLicenseOwner && (
              <Input label="Mining License No. *" value={form.miningLicenseNo}
                onChange={(e) => set('miningLicenseNo', e.target.value)} />
            )}

            <Input label="Company Name *" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} error={errors.companyName} />
            <Textarea label="Company Address *" rows={2} value={form.companyAddress} onChange={(e) => set('companyAddress', e.target.value)} error={errors.companyAddress} />
            <Input label="Company Country *" value={form.companyCountry} onChange={(e) => set('companyCountry', e.target.value)} />
            <Input label="Company Email *" type="email" value={form.companyEmail} onChange={(e) => set('companyEmail', e.target.value)} error={errors.companyEmail} />
            <Input label="Company Phone *" value={form.companyPhone} onChange={(e) => set('companyPhone', e.target.value)} error={errors.companyPhone} />

            <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide pt-2">Chamber Membership</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.selfDeclaredIsMember} onChange={(e) => set('selfDeclaredIsMember', e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30" />
              <span className="text-sm text-ink">Are you a member of any chamber of commerce?</span>
            </label>
            {form.selfDeclaredIsMember && (
              <div className="pl-4 border-l-2 border-border space-y-3">
                <div>
                  <Select label="Which chamber are you a member of? *" value={form.tenantId} onValueChange={(v) => set('tenantId', v)} disabled={chamberLocked}
                    placeholder="Select a chamber…"
                    options={onboardedTenants.map((t) => ({ value: t.id, label: `${t.name}${t.city ? ` — ${t.city}` : ''}` }))} />
                  <p className="text-xs text-ink-subtle mt-1">Same chamber your application is routed to — the one selected in Product &amp; Goods.</p>
                </div>
                <Input label="Membership ID *" value={form.selfDeclaredMembershipId}
                  onChange={(e) => set('selfDeclaredMembershipId', e.target.value)} />
              </div>
            )}

            <p className="text-xs font-semibold text-ink-subtle uppercase tracking-wide pt-2">Consignee</p>
            <Input label="Consignee Full Legal Name *" value={form.consigneeName} onChange={(e) => set('consigneeName', e.target.value)} error={errors.consigneeName} />
            <Textarea label="Consignee Address *" rows={2} value={form.consigneeAddress} onChange={(e) => set('consigneeAddress', e.target.value)} error={errors.consigneeAddress} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-medium text-ink mb-1">Shipment & Transport</h2>
            <p className="text-xs text-ink-subtle mb-3">
              If any of these details aren&apos;t known yet, tick &quot;I don&apos;t know yet&quot; — we&apos;ll record it as unknown ({UNKNOWN_VALUE}).
            </p>

            <div>
              <label className={labelClass}>Departure Date *</label>
              <input type="date" disabled={departureUnknown}
                className={`${selectClass} ${departureUnknown ? 'bg-surface-alt text-ink-subtle' : ''}`}
                value={departureUnknown ? '' : form.departureDate}
                onChange={(e) => set('departureDate', e.target.value)} />
              <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                <input type="checkbox" checked={departureUnknown}
                  onChange={(e) => setUnknown('departureDate', setDepartureUnknown, e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/30" />
                <span className="text-xs text-ink-subtle">I don&apos;t know yet</span>
              </label>
            </div>

            <Select label="Means of Transport *" value={form.meansOfTransport} onValueChange={(v) => set('meansOfTransport', v as FormState['meansOfTransport'])}
              options={MEANS_OF_TRANSPORT.map((m) => ({ value: m.value as string, label: m.label }))} />

            <div>
              <Input label="Vessel/Flight/Vehicle Name & Voyage No. *" disabled={vesselUnknown}
                value={vesselUnknown ? '' : form.vesselFlightVehicleNameVoyageNo}
                onChange={(e) => set('vesselFlightVehicleNameVoyageNo', e.target.value)} />
              <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                <input type="checkbox" checked={vesselUnknown}
                  onChange={(e) => setUnknown('vesselFlightVehicleNameVoyageNo', setVesselUnknown, e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/30" />
                <span className="text-xs text-ink-subtle">I don&apos;t know yet</span>
              </label>
            </div>

            <div>
              <Input label="Port of Loading *" disabled={loadingPortUnknown}
                value={loadingPortUnknown ? '' : form.portOfLoading}
                onChange={(e) => set('portOfLoading', e.target.value)} />
              <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                <input type="checkbox" checked={loadingPortUnknown}
                  onChange={(e) => setUnknown('portOfLoading', setLoadingPortUnknown, e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/30" />
                <span className="text-xs text-ink-subtle">I don&apos;t know yet</span>
              </label>
            </div>

            <div>
              <Input label="Port of Discharge *" disabled={dischargePortUnknown}
                value={dischargePortUnknown ? '' : form.portOfDischarge}
                onChange={(e) => set('portOfDischarge', e.target.value)} />
              <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                <input type="checkbox" checked={dischargePortUnknown}
                  onChange={(e) => setUnknown('portOfDischarge', setDischargePortUnknown, e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/30" />
                <span className="text-xs text-ink-subtle">I don&apos;t know yet</span>
              </label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-medium text-ink mb-4">Commercial Information</h2>
            <Input label="Invoice Number" placeholder="Optional" value={form.invoiceNumber} onChange={(e) => set('invoiceNumber', e.target.value)} />
            <Input label="Invoice Date *" type="date" value={form.invoiceDate} onChange={(e) => set('invoiceDate', e.target.value)} />
            <div className="grid grid-cols-3 gap-3 items-start">
              <div className="col-span-2">
                <Input label="Invoice Total *" type="number" min="0.01" step="0.01"
                  placeholder={form.invoiceCurrency === 'USD' ? 'Amount in US Dollars, must be greater than 0' : 'Amount in Naira, must be greater than 0'}
                  value={form.invoiceTotal} onChange={(e) => set('invoiceTotal', e.target.value)} error={errors.invoiceTotal} />
              </div>
              <Select label="Currency *" value={form.invoiceCurrency} onValueChange={(v) => set('invoiceCurrency', v as 'NGN' | 'USD')}
                options={[{ value: 'NGN', label: 'NGN (₦)' }, { value: 'USD', label: 'USD ($)' }]} />
            </div>
            {form.invoiceCurrency === 'USD' && (
              <p className="text-xs text-ink-subtle -mt-2">
                The application fee is charged in Naira — your USD amount will be converted at the exchange rate in effect when your application is reviewed.
              </p>
            )}
            <Input label="Customer Order / LC No." placeholder="Optional" value={form.customerOrderOrLcNo}
              onChange={(e) => set('customerOrderOrLcNo', e.target.value)} />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="mb-4">
              <h2 className="font-medium text-ink">Compliance / Declaration Documents</h2>
              <p className="text-xs text-ink-subtle mt-1">All four documents below are required. Select from your library or upload new files.</p>
            </div>
            <DocSlot label="Attach Invoice *" filterCategory="commercial_invoice" selectedDocId={invoiceDocId} onSelectDocId={setInvoiceDocId} selectedFile={invoiceFile} onSelectFile={setInvoiceFile} hasConnection={hasConnection} />
            <DocSlot label="Signature *" filterCategory="signature" selectedDocId={signatureDocId} onSelectDocId={setSignatureDocId} selectedFile={signatureFile} onSelectFile={setSignatureFile} hasConnection={hasConnection} />
            <DocSlot label="CAC Certificate *" filterCategory="cac_certificate" selectedDocId={cacCertificateDocId} onSelectDocId={setCacCertificateDocId} selectedFile={cacCertificateFile} onSelectFile={setCacCertificateFile} hasConnection={hasConnection} />
            <DocSlot label="NEPC Certificate *" filterCategory="nepc_certificate" selectedDocId={nepcCertificateDocId} onSelectDocId={setNepcCertificateDocId} selectedFile={nepcCertificateFile} onSelectFile={setNepcCertificateFile} hasConnection={hasConnection} />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h2 className="font-medium text-ink">Review Your Application</h2>

            <ReviewSection title="Product & Goods" onEdit={() => setStep(0)} rows={[
              { label: 'Chamber', value: onboardedTenants.find((t) => t.id === form.tenantId)?.name ?? form.tenantId },
              { label: 'Solid Mineral', value: selectedMineral?.name ?? '—' },
              { label: 'HS Code', value: selectedMineral?.hsCode ?? '—' },
              { label: 'Description', value: form.descriptionOfGoods },
              { label: 'Packages', value: form.numberAndKindOfPackages },
              { label: 'Marks & Numbers', value: form.marksAndNumbers || '—' },
              { label: 'Quantity', value: form.quantity ? `${form.quantity} ${form.quantityUnit}` : '—' },
              { label: 'Origin States', value: form.originStates.join(', ') || '—' },
              { label: 'Destination', value: [form.destinationCountry, form.destinationPort].filter(Boolean).join(', ') || '—' },
              { label: 'Batch/ID No.', value: form.batchIdNo || '—' },
            ]} />

            <ReviewSection title="Exporter/Company & Consignee" onEdit={() => setStep(1)} rows={[
              { label: 'License Owner', value: form.isLicenseOwner ? `Yes (${form.miningLicenseNo || '—'})` : 'No' },
              { label: 'Company', value: form.companyName },
              { label: 'Company Address', value: form.companyAddress },
              { label: 'Company Country', value: form.companyCountry },
              { label: 'Company Email', value: form.companyEmail },
              { label: 'Company Phone', value: form.companyPhone },
              { label: 'Chamber Member', value: form.selfDeclaredIsMember ? `Yes (${form.selfDeclaredMembershipId || '—'})` : 'No' },
              { label: 'Consignee', value: form.consigneeName },
              { label: 'Consignee Address', value: form.consigneeAddress },
            ]} />

            <ReviewSection title="Shipment & Transport" onEdit={() => setStep(2)} rows={[
              { label: 'Departure Date', value: form.departureDate || '—' },
              { label: 'Means of Transport', value: MEANS_OF_TRANSPORT.find((m) => m.value === form.meansOfTransport)?.label ?? form.meansOfTransport },
              { label: 'Vessel/Flight/Vehicle & Voyage No.', value: form.vesselFlightVehicleNameVoyageNo || '—' },
              { label: 'Port of Loading', value: form.portOfLoading || '—' },
              { label: 'Port of Discharge', value: form.portOfDischarge || '—' },
            ]} />

            <ReviewSection title="Commercial Information" onEdit={() => setStep(3)} rows={[
              { label: 'Invoice Number', value: form.invoiceNumber || '—' },
              { label: 'Invoice Date', value: form.invoiceDate },
              { label: 'Invoice Total', value: form.invoiceTotal ? `${form.invoiceCurrency === 'USD' ? '$' : '₦'}${Number(form.invoiceTotal).toLocaleString()}` : '—' },
              { label: 'Customer Order / LC No.', value: form.customerOrderOrLcNo || '—' },
            ]} />

            <ReviewSection title="Compliance Documents" onEdit={() => setStep(4)} rows={[
              { label: 'Invoice', value: invoiceFile?.name ?? (invoiceDocId ? (myDocs.find((d) => d.id === invoiceDocId)?.name ?? 'Attached') : '—') },
              { label: 'Signature', value: signatureFile?.name ?? (signatureDocId ? (myDocs.find((d) => d.id === signatureDocId)?.name ?? 'Attached') : '—') },
              { label: 'CAC Certificate', value: cacCertificateFile?.name ?? (cacCertificateDocId ? (myDocs.find((d) => d.id === cacCertificateDocId)?.name ?? 'Attached') : '—') },
              { label: 'NEPC Certificate', value: nepcCertificateFile?.name ?? (nepcCertificateDocId ? (myDocs.find((d) => d.id === nepcCertificateDocId)?.name ?? 'Attached') : '—') },
            ]} />

            {feeEstimate && (
              <div className="rounded-lg bg-success-bg border border-primary/20 px-4 py-3 text-sm text-ink">
                <p className="font-medium mb-1">Estimated Application Fee</p>
                <p className="text-xs text-ink-subtle">
                  ₦{feeEstimate.verified.toLocaleString(undefined, { maximumFractionDigits: 2 })} (0.11% — if chamber membership is verified) or{' '}
                  ₦{feeEstimate.unverified.toLocaleString(undefined, { maximumFractionDigits: 2 })} (0.125% — otherwise).
                  The final fee is confirmed by the reviewer at approval.
                  {form.invoiceCurrency === 'USD' && ' This estimate converts your USD invoice at an approximate rate — the exact fee is set using the rate in effect when reviewed.'}
                </p>
              </div>
            )}

            <p className="text-xs text-ink-subtle">By submitting, you confirm that all information is accurate and complete.</p>
          </div>
        )}
      </Card>

      <div className="sticky bottom-0 -mx-6 mt-6 flex items-center justify-between bg-surface border-t border-border px-6 py-4">
        <Button variant="outline" onClick={() => step === 0 ? navigate('/dashboard/eco') : setStep((s) => s - 1)}>
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>

        <div className="flex items-center gap-3">
          {/* Save Draft button — visible on every step except the final one */}
          {step < STEPS.length - 1 && (
            <Button
              variant="outline"
              loading={isSavingDraft || isUpdating}
              onClick={handleSaveDraft}
            >
              Save Draft
            </Button>
          )}

          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue[step]}>
              Continue
            </Button>
          ) : (
            <Button loading={isLoading} onClick={handleSubmit}>
              {isRevisionRequested ? 'Resubmit Application' : 'Submit Application'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
