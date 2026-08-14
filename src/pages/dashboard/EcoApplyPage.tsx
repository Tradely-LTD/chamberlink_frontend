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
import { NIGERIAN_STATES } from '@shared/constants/nigerianStates';
import { Input } from '@shared/ui/Input';
import { Button } from '@shared/ui/Button';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { emptyApi } from '@shared/api/emptyApi';
import type { DocumentCategory } from './DocumentsPage';

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

// Inline docs API for library picker
interface LibraryDoc { id: string; name: string; category: DocumentCategory; uploadedAt: string; }
interface DocsApiResponse { success: boolean; data: LibraryDoc[]; }
const ecoDocsApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    getLibraryDocsForEco: builder.query<LibraryDoc[], void>({
      query: () => '/membership/me/documents',
      transformResponse: (res: DocsApiResponse) => res.data ?? [],
      providesTags: ['Documents'],
    }),
  }),
  overrideExisting: false,
});
const { useGetLibraryDocsForEcoQuery } = ecoDocsApi;

type SupportingDocMode = 'library' | 'upload';

function DocSlot({ label, filterCategory, selectedDocId, selectedFile, onSelectDocId, onSelectFile }: {
  label: string; filterCategory: DocumentCategory;
  selectedDocId: string | null; selectedFile: File | null;
  onSelectDocId: (id: string | null) => void; onSelectFile: (file: File | null) => void;
}) {
  const { data: allDocs = [] } = useGetLibraryDocsForEcoQuery();
  const [mode, setMode] = useState<SupportingDocMode>('library');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const matchingDocs = allDocs.filter((d) => d.category === filterCategory);

  return (
    <div className="rounded-xl border border-[#bec9bf]/40 overflow-hidden">
      <div className="px-4 py-3 bg-[#fdf8f3] border-b border-[#bec9bf]/30 flex items-center justify-between">
        <p className="text-sm font-medium text-[#221a0f]">{label}</p>
        <div className="flex items-center gap-1 bg-white rounded-lg border border-[#bec9bf]/40 p-0.5">
          {(['library', 'upload'] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); onSelectDocId(null); onSelectFile(null); }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${mode === m ? 'bg-[#023293] text-white' : 'text-[#8A7E6E] hover:text-[#221a0f]'}`}>
              {m === 'library' ? 'From Library' : 'Upload New'}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4">
        {mode === 'library' ? (
          matchingDocs.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-[#8A7E6E]">No {label.toLowerCase()} in your library.</p>
              <button onClick={() => setMode('upload')} className="mt-2 text-xs text-[#023293] hover:underline font-medium">Upload one now</button>
            </div>
          ) : (
            <div className="space-y-2">
              {matchingDocs.map((doc) => (
                <label key={doc.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedDocId === doc.id ? 'border-[#023293] bg-[#f0faf4]' : 'border-[#bec9bf]/40 hover:border-[#023293]/40'}`}>
                  <input type="radio" name={`doc-${filterCategory}`} value={doc.id} checked={selectedDocId === doc.id} onChange={() => onSelectDocId(doc.id)} className="text-[#023293] focus:ring-[#023293]/30" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#221a0f] truncate">{doc.name}</p>
                    <p className="text-xs text-[#8A7E6E]">{new Date(doc.uploadedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  {selectedDocId === doc.id && <svg className="w-4 h-4 text-[#023293] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                </label>
              ))}
              {selectedDocId && <button onClick={() => onSelectDocId(null)} className="text-xs text-[#8A7E6E] hover:text-[#221a0f]">Clear selection</button>}
            </div>
          )
        ) : (
          <div>
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)} />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-[#bec9bf]/60 px-4 py-5 text-center hover:border-[#023293] transition-colors">
              {selectedFile ? (
                <div><p className="text-sm font-medium text-[#221a0f]">{selectedFile.name}</p><p className="text-xs text-[#8A7E6E] mt-0.5">{(selectedFile.size / 1024).toFixed(0)} KB</p></div>
              ) : (
                <div>
                  <svg className="w-5 h-5 mx-auto text-[#8A7E6E] mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  <p className="text-sm text-[#8A7E6E]">Click to select file</p>
                  <p className="text-xs text-[#8A7E6E] mt-0.5">PDF, JPEG, PNG · Max 10MB</p>
                </div>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const textareaClass = 'w-full rounded-lg border border-[#bec9bf]/60 px-3 py-2.5 text-sm text-[#221a0f] placeholder-[#8A7E6E] focus:outline-none focus:ring-2 focus:ring-[#023293]/30 focus:border-[#023293] resize-none';
const selectClass = 'w-full rounded-lg border border-[#bec9bf]/60 px-3 py-2.5 text-sm text-[#221a0f] focus:outline-none focus:ring-2 focus:ring-[#023293]/30 focus:border-[#023293]';
const labelClass = 'block text-sm font-medium text-[#221a0f] mb-1.5';

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
  invoiceNumber: '', invoiceDate: '', invoiceTotal: '', customerOrderOrLcNo: '',
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
  const [createEcoWithFiles, { isLoading: isCreatingFiles }] = useCreateEcoCertificateWithFilesMutation();
  const [saveDraftEco, { isLoading: isSavingDraft }] = useSaveDraftEcoMutation();
  const [updateDraft, { isLoading: isUpdating }] = useUpdateEcoDraftMutation();
  const [submitDraft, { isLoading: isSubmitting }] = useSubmitEcoDraftMutation();

  const isLoading = isCreating || isCreatingFiles || isSubmitting;
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
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [signatureDocId, setSignatureDocId] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [cacCertificateDocId, setCacCertificateDocId] = useState<string | null>(null);
  const [cacCertificateFile, setCacCertificateFile] = useState<File | null>(null);
  const [nepcCertificateDocId, setNepcCertificateDocId] = useState<string | null>(null);
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

  const toggleOriginState = (stateName: string) => {
    setForm((f) => ({
      ...f,
      originStates: f.originStates.includes(stateName)
        ? f.originStates.filter((s) => s !== stateName)
        : [...f.originStates, stateName],
    }));
  };

  const setUnknown = (
    field: 'departureDate' | 'vesselFlightVehicleNameVoyageNo' | 'portOfLoading' | 'portOfDischarge',
    setter: (v: boolean) => void,
    checked: boolean,
  ) => {
    setter(checked);
    set(field, checked ? UNKNOWN_VALUE : '');
  };

  const selectedMineral = solidMinerals.find((m) => m.id === form.solidMineralId);

  const buildFormDataOrJson = () => {
    const hasFiles = !!(invoiceFile || signatureFile || cacCertificateFile || nepcCertificateFile);

    const jsonBody: Partial<NewECertPayload> = {
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
      customerOrderOrLcNo: form.customerOrderOrLcNo || undefined,
      tenantId: form.tenantId || undefined,
      selfDeclaredIsMember: form.selfDeclaredIsMember,
      selfDeclaredMembershipId: form.selfDeclaredIsMember ? (form.selfDeclaredMembershipId || undefined) : undefined,
      invoiceDocId: invoiceDocId ?? undefined,
      signatureDocId: signatureDocId ?? undefined,
      cacCertificateDocId: cacCertificateDocId ?? undefined,
      nepcCertificateDocId: nepcCertificateDocId ?? undefined,
    };

    if (!hasFiles) {
      return { isFormData: false as const, body: jsonBody };
    }

    const fd = new FormData();
    const append = (k: string, v: string | boolean | number | undefined) => { if (v !== undefined && v !== '') fd.append(k, String(v)); };
    append('solidMineralId', form.solidMineralId);
    append('descriptionOfGoods', form.descriptionOfGoods);
    append('numberAndKindOfPackages', form.numberAndKindOfPackages);
    append('marksAndNumbers', form.marksAndNumbers);
    if (form.quantity) append('quantity', Number(form.quantity));
    append('quantityUnit', form.quantityUnit);
    fd.append('originStates', JSON.stringify(form.originStates));
    append('destinationCountry', form.destinationCountry);
    append('destinationPort', form.destinationPort);
    append('batchIdNo', form.batchIdNo);
    append('isLicenseOwner', form.isLicenseOwner);
    if (form.isLicenseOwner) append('miningLicenseNo', form.miningLicenseNo);
    append('companyName', form.companyName);
    append('companyAddress', form.companyAddress);
    append('companyCountry', form.companyCountry);
    append('companyEmail', form.companyEmail);
    append('companyPhone', form.companyPhone);
    append('consigneeName', form.consigneeName);
    append('consigneeAddress', form.consigneeAddress);
    append('departureDate', form.departureDate);
    append('meansOfTransport', form.meansOfTransport);
    append('vesselFlightVehicleNameVoyageNo', form.vesselFlightVehicleNameVoyageNo);
    append('portOfLoading', form.portOfLoading);
    append('portOfDischarge', form.portOfDischarge);
    append('invoiceNumber', form.invoiceNumber);
    append('invoiceDate', form.invoiceDate);
    if (form.invoiceTotal) append('invoiceTotal', Number(form.invoiceTotal));
    append('customerOrderOrLcNo', form.customerOrderOrLcNo);
    append('tenantId', form.tenantId);
    append('selfDeclaredIsMember', form.selfDeclaredIsMember);
    if (form.selfDeclaredIsMember) append('selfDeclaredMembershipId', form.selfDeclaredMembershipId);
    if (invoiceFile) fd.append('invoice', invoiceFile);
    if (signatureFile) fd.append('signature', signatureFile);
    if (cacCertificateFile) fd.append('cacCertificate', cacCertificateFile);
    if (nepcCertificateFile) fd.append('nepcCertificate', nepcCertificateFile);
    if (invoiceDocId) append('invoiceDocId', invoiceDocId);
    if (signatureDocId) append('signatureDocId', signatureDocId);
    if (cacCertificateDocId) append('cacCertificateDocId', cacCertificateDocId);
    if (nepcCertificateDocId) append('nepcCertificateDocId', nepcCertificateDocId);

    return { isFormData: true as const, body: fd };
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
  );
  const canContinueStep1 = !!(
    form.companyName && form.companyAddress && form.companyCountry && form.companyEmail && form.companyPhone
    && form.consigneeName && form.consigneeAddress
    && (!form.isLicenseOwner || form.miningLicenseNo)
    && (!form.selfDeclaredIsMember || form.selfDeclaredMembershipId)
  );
  const canContinueStep2 = !!(
    form.departureDate && form.meansOfTransport && form.vesselFlightVehicleNameVoyageNo
    && form.portOfLoading && form.portOfDischarge
  );
  const canContinueStep3 = !!(form.invoiceNumber && form.invoiceDate && form.invoiceTotal && Number(form.invoiceTotal) > 0);

  const canContinue = [canContinueStep0, canContinueStep1, canContinueStep2, canContinueStep3, true, true];

  const feeEstimate = form.invoiceTotal
    ? {
      verified: Number(form.invoiceTotal) * 0.0011,
      unverified: Number(form.invoiceTotal) * 0.00125,
    }
    : null;

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link to="/dashboard/eco" className="text-sm text-[#8A7E6E] hover:text-[#221a0f]">eCO Certificates</Link>
        <span className="text-[#8A7E6E]">/</span>
        <span className="text-sm text-[#221a0f]">{isEditing ? 'Edit Application' : 'New Application'}</span>
      </div>

      <h1 className="text-2xl font-semibold text-[#221a0f] mb-1">
        {isRevisionRequested ? 'Resubmit Application' : isEditing ? 'Continue Draft' : 'Apply for Certificate of Origin'}
      </h1>
      <p className="text-sm text-[#8A7E6E] mb-2">Complete all required fields to submit your eCO application.</p>

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
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${i <= step ? 'bg-[#023293] text-white' : 'bg-[#bec9bf]/30 text-[#8A7E6E]'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1 whitespace-nowrap ${i === step ? 'text-[#023293] font-medium' : 'text-[#8A7E6E]'}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-2 mb-5 min-w-[16px] ${i < step ? 'bg-[#023293]' : 'bg-[#bec9bf]/40'}`} />}
          </div>
        ))}
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="bg-white rounded-xl border border-[#bec9bf]/40 p-6">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-medium text-[#221a0f] mb-4">Product & Goods Details</h2>

            <div>
              <label className={labelClass}>From which Chamber of Commerce? *</label>
              {chamberLocked ? (
                <>
                  <input
                    disabled
                    value={onboardedTenants.find((t) => t.id === form.tenantId)?.name ?? form.tenantId}
                    className={`${selectClass} bg-[#f7f9f7] text-[#8A7E6E] cursor-not-allowed`}
                  />
                  <p className="text-xs text-[#8A7E6E] mt-1">Locked after first submission.</p>
                </>
              ) : (
                <select className={selectClass} value={form.tenantId} onChange={(e) => set('tenantId', e.target.value)}>
                  <option value="">Select a chamber…</option>
                  {onboardedTenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}{t.city ? ` — ${t.city}` : ''}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className={labelClass}>Solid Mineral *</label>
              <select className={selectClass} value={form.solidMineralId} onChange={(e) => set('solidMineralId', e.target.value)}>
                <option value="">Select a mineral…</option>
                {solidMinerals.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              {selectedMineral && (
                <div className="mt-1.5">
                  <label className="block text-xs text-[#8A7E6E] mb-0.5">HS Code (auto-derived)</label>
                  <input readOnly disabled value={selectedMineral.hsCode} className={`${selectClass} bg-[#f7f9f7] text-[#8A7E6E] cursor-not-allowed`} />
                </div>
              )}
            </div>

            <div>
              <label className={labelClass}>Description of Goods *</label>
              <textarea rows={3} className={textareaClass} placeholder="Describe the goods being exported"
                value={form.descriptionOfGoods} onChange={(e) => set('descriptionOfGoods', e.target.value)} />
            </div>

            <Input label="Number and Kind of Packages *" placeholder="e.g. 50 sacks" value={form.numberAndKindOfPackages}
              onChange={(e) => set('numberAndKindOfPackages', e.target.value)} />
            <Input label="Marks and Numbers" placeholder="Optional shipping marks" value={form.marksAndNumbers}
              onChange={(e) => set('marksAndNumbers', e.target.value)} />

            <div className="grid grid-cols-2 gap-3">
              <Input label="Quantity *" type="number" placeholder="e.g. 1000" value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)} />
              <div>
                <label className={labelClass}>Unit *</label>
                <select className={selectClass} value={form.quantityUnit} onChange={(e) => set('quantityUnit', e.target.value as 'KG' | 'MT')}>
                  <option value="KG">KG</option>
                  <option value="MT">MT</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelClass}>Origin of Goods (Nigerian States) — select one or more *</label>
              <div className="max-h-48 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-1.5 rounded-lg border border-[#bec9bf]/60 p-3">
                {NIGERIAN_STATES.map((stateName) => (
                  <label key={stateName} className="flex items-center gap-1.5 text-xs text-[#221a0f] cursor-pointer">
                    <input type="checkbox" checked={form.originStates.includes(stateName)}
                      onChange={() => toggleOriginState(stateName)}
                      className="w-3.5 h-3.5 rounded border-[#bec9bf] text-[#023293] focus:ring-[#023293]/30" />
                    {stateName}
                  </label>
                ))}
              </div>
              {form.originStates.length > 0 && (
                <p className="text-xs text-[#8A7E6E] mt-1">{form.originStates.join(', ')}</p>
              )}
            </div>

            <Input label="Destination Country *" placeholder="e.g. United Arab Emirates" value={form.destinationCountry}
              onChange={(e) => set('destinationCountry', e.target.value)} />
            <Input label="Destination Port" placeholder="Optional" value={form.destinationPort}
              onChange={(e) => set('destinationPort', e.target.value)} />
            <Input label="Batch/ID No." placeholder="Optional" value={form.batchIdNo}
              onChange={(e) => set('batchIdNo', e.target.value)} />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-medium text-[#221a0f] mb-4">Exporter/Company & Consignee Details</h2>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.isLicenseOwner} onChange={(e) => set('isLicenseOwner', e.target.checked)}
                className="w-4 h-4 rounded border-[#bec9bf] text-[#023293] focus:ring-[#023293]/30" />
              <span className="text-sm text-[#221a0f]">I am the mining license owner</span>
            </label>
            {form.isLicenseOwner && (
              <Input label="Mining License No. *" value={form.miningLicenseNo}
                onChange={(e) => set('miningLicenseNo', e.target.value)} />
            )}

            <Input label="Company Name *" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
            <div>
              <label className={labelClass}>Company Address *</label>
              <textarea rows={2} className={textareaClass} value={form.companyAddress} onChange={(e) => set('companyAddress', e.target.value)} />
            </div>
            <Input label="Company Country *" value={form.companyCountry} onChange={(e) => set('companyCountry', e.target.value)} />
            <Input label="Company Email *" type="email" value={form.companyEmail} onChange={(e) => set('companyEmail', e.target.value)} />
            <Input label="Company Phone *" value={form.companyPhone} onChange={(e) => set('companyPhone', e.target.value)} />

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.selfDeclaredIsMember} onChange={(e) => set('selfDeclaredIsMember', e.target.checked)}
                className="w-4 h-4 rounded border-[#bec9bf] text-[#023293] focus:ring-[#023293]/30" />
              <span className="text-sm text-[#221a0f]">Are you a member of any chamber of commerce?</span>
            </label>
            {form.selfDeclaredIsMember && (
              <Input label="Membership ID *" value={form.selfDeclaredMembershipId}
                onChange={(e) => set('selfDeclaredMembershipId', e.target.value)} />
            )}

            <hr className="border-[#bec9bf]/30" />

            <Input label="Consignee Full Legal Name *" value={form.consigneeName} onChange={(e) => set('consigneeName', e.target.value)} />
            <div>
              <label className={labelClass}>Consignee Address *</label>
              <textarea rows={2} className={textareaClass} value={form.consigneeAddress} onChange={(e) => set('consigneeAddress', e.target.value)} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-medium text-[#221a0f] mb-1">Shipment & Transport</h2>
            <p className="text-xs text-[#8A7E6E] mb-3">
              If any of these details aren&apos;t known yet, tick &quot;I don&apos;t know yet&quot; — we&apos;ll record it as unknown ({UNKNOWN_VALUE}).
            </p>

            <div>
              <label className={labelClass}>Departure Date *</label>
              <input type="date" disabled={departureUnknown}
                className={`${selectClass} ${departureUnknown ? 'bg-[#f7f9f7] text-[#8A7E6E]' : ''}`}
                value={departureUnknown ? '' : form.departureDate}
                onChange={(e) => set('departureDate', e.target.value)} />
              <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                <input type="checkbox" checked={departureUnknown}
                  onChange={(e) => setUnknown('departureDate', setDepartureUnknown, e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-[#bec9bf] text-[#023293] focus:ring-[#023293]/30" />
                <span className="text-xs text-[#8A7E6E]">I don&apos;t know yet</span>
              </label>
            </div>

            <div>
              <label className={labelClass}>Means of Transport *</label>
              <select className={selectClass} value={form.meansOfTransport} onChange={(e) => set('meansOfTransport', e.target.value as FormState['meansOfTransport'])}>
                {MEANS_OF_TRANSPORT.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            <div>
              <Input label="Vessel/Flight/Vehicle Name & Voyage No. *" disabled={vesselUnknown}
                value={vesselUnknown ? '' : form.vesselFlightVehicleNameVoyageNo}
                onChange={(e) => set('vesselFlightVehicleNameVoyageNo', e.target.value)} />
              <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                <input type="checkbox" checked={vesselUnknown}
                  onChange={(e) => setUnknown('vesselFlightVehicleNameVoyageNo', setVesselUnknown, e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-[#bec9bf] text-[#023293] focus:ring-[#023293]/30" />
                <span className="text-xs text-[#8A7E6E]">I don&apos;t know yet</span>
              </label>
            </div>

            <div>
              <Input label="Port of Loading *" disabled={loadingPortUnknown}
                value={loadingPortUnknown ? '' : form.portOfLoading}
                onChange={(e) => set('portOfLoading', e.target.value)} />
              <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                <input type="checkbox" checked={loadingPortUnknown}
                  onChange={(e) => setUnknown('portOfLoading', setLoadingPortUnknown, e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-[#bec9bf] text-[#023293] focus:ring-[#023293]/30" />
                <span className="text-xs text-[#8A7E6E]">I don&apos;t know yet</span>
              </label>
            </div>

            <div>
              <Input label="Port of Discharge *" disabled={dischargePortUnknown}
                value={dischargePortUnknown ? '' : form.portOfDischarge}
                onChange={(e) => set('portOfDischarge', e.target.value)} />
              <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                <input type="checkbox" checked={dischargePortUnknown}
                  onChange={(e) => setUnknown('portOfDischarge', setDischargePortUnknown, e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-[#bec9bf] text-[#023293] focus:ring-[#023293]/30" />
                <span className="text-xs text-[#8A7E6E]">I don&apos;t know yet</span>
              </label>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-medium text-[#221a0f] mb-4">Commercial Information</h2>
            <Input label="Invoice Number *" value={form.invoiceNumber} onChange={(e) => set('invoiceNumber', e.target.value)} />
            <Input label="Invoice Date *" type="date" value={form.invoiceDate} onChange={(e) => set('invoiceDate', e.target.value)} />
            <Input label="Invoice Total (NGN) *" type="number" min="0.01" step="0.01" placeholder="Amount in Naira, must be greater than 0"
              value={form.invoiceTotal} onChange={(e) => set('invoiceTotal', e.target.value)} />
            {form.invoiceTotal !== '' && Number(form.invoiceTotal) <= 0 && (
              <p className="text-xs text-red-600">Invoice Total must be greater than zero.</p>
            )}
            <Input label="Customer Order / LC No." placeholder="Optional" value={form.customerOrderOrLcNo}
              onChange={(e) => set('customerOrderOrLcNo', e.target.value)} />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="mb-4">
              <h2 className="font-medium text-[#221a0f]">Compliance / Declaration Documents</h2>
              <p className="text-xs text-[#8A7E6E] mt-1">Select from your library or upload new files.</p>
            </div>
            <DocSlot label="Attach Invoice" filterCategory="commercial_invoice" selectedDocId={invoiceDocId} selectedFile={invoiceFile} onSelectDocId={setInvoiceDocId} onSelectFile={setInvoiceFile} />
            <DocSlot label="Signature" filterCategory="signature" selectedDocId={signatureDocId} selectedFile={signatureFile} onSelectDocId={setSignatureDocId} onSelectFile={setSignatureFile} />
            <DocSlot label="CAC Certificate" filterCategory="cac_certificate" selectedDocId={cacCertificateDocId} selectedFile={cacCertificateFile} onSelectDocId={setCacCertificateDocId} onSelectFile={setCacCertificateFile} />
            <DocSlot label="NEPC Certificate" filterCategory="nepc_certificate" selectedDocId={nepcCertificateDocId} selectedFile={nepcCertificateFile} onSelectDocId={setNepcCertificateDocId} onSelectFile={setNepcCertificateFile} />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h2 className="font-medium text-[#221a0f]">Review Your Application</h2>

            <div>
              <h3 className="text-xs font-semibold text-[#8A7E6E] uppercase tracking-wide mb-2">Product & Goods</h3>
              <dl className="divide-y divide-[#bec9bf]/30 rounded-lg border border-[#bec9bf]/40 overflow-hidden">
                {[
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
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-3 gap-4 px-4 py-3">
                    <dt className="text-sm text-[#8A7E6E]">{row.label}</dt>
                    <dd className="col-span-2 text-sm text-[#221a0f]">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-[#8A7E6E] uppercase tracking-wide mb-2">Exporter/Company & Consignee</h3>
              <dl className="divide-y divide-[#bec9bf]/30 rounded-lg border border-[#bec9bf]/40 overflow-hidden">
                {[
                  { label: 'License Owner', value: form.isLicenseOwner ? `Yes (${form.miningLicenseNo || '—'})` : 'No' },
                  { label: 'Company', value: form.companyName },
                  { label: 'Company Address', value: form.companyAddress },
                  { label: 'Company Country', value: form.companyCountry },
                  { label: 'Company Email', value: form.companyEmail },
                  { label: 'Company Phone', value: form.companyPhone },
                  { label: 'Chamber Member', value: form.selfDeclaredIsMember ? `Yes (${form.selfDeclaredMembershipId || '—'})` : 'No' },
                  { label: 'Consignee', value: form.consigneeName },
                  { label: 'Consignee Address', value: form.consigneeAddress },
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-3 gap-4 px-4 py-3">
                    <dt className="text-sm text-[#8A7E6E]">{row.label}</dt>
                    <dd className="col-span-2 text-sm text-[#221a0f]">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-[#8A7E6E] uppercase tracking-wide mb-2">Shipment & Transport</h3>
              <dl className="divide-y divide-[#bec9bf]/30 rounded-lg border border-[#bec9bf]/40 overflow-hidden">
                {[
                  { label: 'Departure Date', value: form.departureDate || '—' },
                  { label: 'Means of Transport', value: MEANS_OF_TRANSPORT.find((m) => m.value === form.meansOfTransport)?.label ?? form.meansOfTransport },
                  { label: 'Vessel/Flight/Vehicle & Voyage No.', value: form.vesselFlightVehicleNameVoyageNo || '—' },
                  { label: 'Port of Loading', value: form.portOfLoading || '—' },
                  { label: 'Port of Discharge', value: form.portOfDischarge || '—' },
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-3 gap-4 px-4 py-3">
                    <dt className="text-sm text-[#8A7E6E]">{row.label}</dt>
                    <dd className="col-span-2 text-sm text-[#221a0f]">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-[#8A7E6E] uppercase tracking-wide mb-2">Commercial Information</h3>
              <dl className="divide-y divide-[#bec9bf]/30 rounded-lg border border-[#bec9bf]/40 overflow-hidden">
                {[
                  { label: 'Invoice Number', value: form.invoiceNumber },
                  { label: 'Invoice Date', value: form.invoiceDate },
                  { label: 'Invoice Total', value: form.invoiceTotal ? `₦${Number(form.invoiceTotal).toLocaleString()}` : '—' },
                  { label: 'Customer Order / LC No.', value: form.customerOrderOrLcNo || '—' },
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-3 gap-4 px-4 py-3">
                    <dt className="text-sm text-[#8A7E6E]">{row.label}</dt>
                    <dd className="col-span-2 text-sm text-[#221a0f]">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-[#8A7E6E] uppercase tracking-wide mb-2">Compliance Documents</h3>
              <dl className="divide-y divide-[#bec9bf]/30 rounded-lg border border-[#bec9bf]/40 overflow-hidden">
                {[
                  { label: 'Invoice', value: invoiceFile?.name ?? (invoiceDocId ? 'From library' : '—') },
                  { label: 'Signature', value: signatureFile?.name ?? (signatureDocId ? 'From library' : '—') },
                  { label: 'CAC Certificate', value: cacCertificateFile?.name ?? (cacCertificateDocId ? 'From library' : '—') },
                  { label: 'NEPC Certificate', value: nepcCertificateFile?.name ?? (nepcCertificateDocId ? 'From library' : '—') },
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-3 gap-4 px-4 py-3">
                    <dt className="text-sm text-[#8A7E6E]">{row.label}</dt>
                    <dd className="col-span-2 text-sm text-[#221a0f]">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {feeEstimate && (
              <div className="rounded-lg bg-[#f0faf4] border border-[#023293]/20 px-4 py-3 text-sm text-[#221a0f]">
                <p className="font-medium mb-1">Estimated Application Fee</p>
                <p className="text-xs text-[#8A7E6E]">
                  ₦{feeEstimate.verified.toLocaleString(undefined, { maximumFractionDigits: 2 })} (0.11% — if chamber membership is verified) or{' '}
                  ₦{feeEstimate.unverified.toLocaleString(undefined, { maximumFractionDigits: 2 })} (0.125% — otherwise).
                  The final fee is confirmed by the reviewer at approval.
                </p>
              </div>
            )}

            <p className="text-xs text-[#8A7E6E]">By submitting, you confirm that all information is accurate and complete.</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-6">
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
