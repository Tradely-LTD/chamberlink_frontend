import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  useCreateEcoCertificateMutation,
  useCreateEcoCertificateWithFilesMutation,
  useSaveDraftEcoMutation,
  useUpdateEcoDraftMutation,
  useSubmitEcoDraftMutation,
  useGetEcoCertificateQuery,
} from '@features/eco/ecoApi';
import type { NewECertPayload } from '@features/eco/ecoApi';
import { Input } from '@shared/ui/Input';
import { Button } from '@shared/ui/Button';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { emptyApi } from '@shared/api/emptyApi';
import type { DocumentCategory } from './DocumentsPage';

const STEPS = ['Cargo Details', 'Parties & Route', 'Supporting Documents', 'Review & Submit'];

const SHIPPING_METHODS: { label: string; value: NewECertPayload['shippingMethod'] }[] = [
  { label: 'Sea Freight', value: 'sea' },
  { label: 'Air Freight', value: 'air' },
  { label: 'Road Transport', value: 'road' },
  { label: 'Rail Freight', value: 'rail' },
];

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
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${mode === m ? 'bg-[#00502e] text-white' : 'text-[#8A7E6E] hover:text-[#221a0f]'}`}>
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
              <button onClick={() => setMode('upload')} className="mt-2 text-xs text-[#00502e] hover:underline font-medium">Upload one now</button>
            </div>
          ) : (
            <div className="space-y-2">
              {matchingDocs.map((doc) => (
                <label key={doc.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedDocId === doc.id ? 'border-[#00502e] bg-[#f0faf4]' : 'border-[#bec9bf]/40 hover:border-[#00502e]/40'}`}>
                  <input type="radio" name={`doc-${filterCategory}`} value={doc.id} checked={selectedDocId === doc.id} onChange={() => onSelectDocId(doc.id)} className="text-[#00502e] focus:ring-[#00502e]/30" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#221a0f] truncate">{doc.name}</p>
                    <p className="text-xs text-[#8A7E6E]">{new Date(doc.uploadedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                  {selectedDocId === doc.id && <svg className="w-4 h-4 text-[#00502e] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                </label>
              ))}
              {selectedDocId && <button onClick={() => onSelectDocId(null)} className="text-xs text-[#8A7E6E] hover:text-[#221a0f]">Clear selection</button>}
            </div>
          )
        ) : (
          <div>
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => onSelectFile(e.target.files?.[0] ?? null)} />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-[#bec9bf]/60 px-4 py-5 text-center hover:border-[#00502e] transition-colors">
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

export function EcoApplyPage() {
  const navigate = useNavigate();
  const { certId } = useParams<{ certId?: string }>();
  const isEditing = !!certId;

  const { data: existingCert } = useGetEcoCertificateQuery(certId ?? '', { skip: !certId });

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

  const [form, setForm] = useState({
    hsCode: '', cargoDescription: '', cargoWeight: '', shippingMethod: 'sea' as NewECertPayload['shippingMethod'],
    destinationCountry: '', destinationPort: '', exporterName: '', exporterAddress: '',
    consigneeName: '', consigneeAddress: '', isExpedited: false,
  });

  const [commercialInvoiceDocId, setCommercialInvoiceDocId] = useState<string | null>(null);
  const [commercialInvoiceFile, setCommercialInvoiceFile] = useState<File | null>(null);
  const [packingListDocId, setPackingListDocId] = useState<string | null>(null);
  const [packingListFile, setPackingListFile] = useState<File | null>(null);

  // Pre-populate form when editing existing draft/revision_requested
  useEffect(() => {
    if (!existingCert) return;
    setForm({
      hsCode: existingCert.hsCode ?? '',
      cargoDescription: existingCert.cargoDescription ?? '',
      cargoWeight: existingCert.cargoWeight ? String(existingCert.cargoWeight) : '',
      shippingMethod: (existingCert.shippingMethod as NewECertPayload['shippingMethod']) ?? 'sea',
      destinationCountry: existingCert.destinationCountry ?? '',
      destinationPort: existingCert.destinationPort ?? '',
      exporterName: existingCert.exporterName ?? '',
      exporterAddress: existingCert.exporterAddress ?? '',
      consigneeName: existingCert.consigneeName ?? '',
      consigneeAddress: existingCert.consigneeAddress ?? '',
      isExpedited: existingCert.isExpedited ?? false,
    });
  }, [existingCert]);

  const set = <K extends keyof typeof form>(field: K, value: typeof form[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const buildFormDataOrJson = () => {
    const hasFiles = !!(commercialInvoiceFile || packingListFile);
    if (!hasFiles) {
      return {
        isFormData: false,
        body: {
          hsCode: form.hsCode || undefined,
          cargoDescription: form.cargoDescription || undefined,
          cargoWeight: form.cargoWeight ? parseFloat(form.cargoWeight) : undefined,
          shippingMethod: form.shippingMethod,
          destinationCountry: form.destinationCountry || undefined,
          destinationPort: form.destinationPort || undefined,
          exporterName: form.exporterName || undefined,
          exporterAddress: form.exporterAddress || undefined,
          consigneeName: form.consigneeName || undefined,
          consigneeAddress: form.consigneeAddress || undefined,
          isExpedited: form.isExpedited,
          commercialInvoiceDocId: commercialInvoiceDocId ?? undefined,
          packingListDocId: packingListDocId ?? undefined,
        } as Partial<NewECertPayload>,
      };
    }
    const fd = new FormData();
    const append = (k: string, v: string | boolean | number | undefined) => { if (v !== undefined) fd.append(k, String(v)); };
    append('hsCode', form.hsCode);
    append('cargoDescription', form.cargoDescription);
    if (form.cargoWeight) append('cargoWeight', parseFloat(form.cargoWeight));
    append('shippingMethod', form.shippingMethod);
    append('destinationCountry', form.destinationCountry);
    if (form.destinationPort) append('destinationPort', form.destinationPort);
    if (form.exporterName) append('exporterName', form.exporterName);
    if (form.exporterAddress) append('exporterAddress', form.exporterAddress);
    if (form.consigneeName) append('consigneeName', form.consigneeName);
    if (form.consigneeAddress) append('consigneeAddress', form.consigneeAddress);
    append('isExpedited', form.isExpedited);
    if (commercialInvoiceFile) fd.append('commercialInvoice', commercialInvoiceFile);
    if (packingListFile) fd.append('packingList', packingListFile);
    if (commercialInvoiceDocId) append('commercialInvoiceDocId', commercialInvoiceDocId);
    if (packingListDocId) append('packingListDocId', packingListDocId);
    return { isFormData: true, body: fd };
  };

  const handleSaveDraft = async () => {
    setError(null);
    try {
      const { isFormData, body } = buildFormDataOrJson();
      if (currentDraftId) {
        const res = await updateDraft({ certId: currentDraftId, body: isFormData ? body as FormData : body }).unwrap();
        setCurrentDraftId(res.id);
      } else {
        const res = await saveDraftEco(isFormData ? body as FormData : body as NewECertPayload).unwrap();
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
    const { isFormData, body } = buildFormDataOrJson();
    try {
      if (currentDraftId) {
        await submitDraft({ certId: currentDraftId, body: isFormData ? body as FormData : body as NewECertPayload }).unwrap();
      } else if (isFormData) {
        await createEcoWithFiles(body as FormData).unwrap();
      } else {
        await createEco(body as NewECertPayload).unwrap();
      }
      navigate('/dashboard/eco');
    } catch {
      setError('Failed to submit application. Please try again.');
    }
  };

  const isRevisionRequested = existingCert?.status === 'revision_requested';
  const canContinueStep0 = !!(form.hsCode && form.cargoDescription && form.cargoWeight);
  const canContinueStep1 = !!(form.destinationCountry && form.exporterName && form.exporterAddress);

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
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${i <= step ? 'bg-[#00502e] text-white' : 'bg-[#bec9bf]/30 text-[#8A7E6E]'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1 whitespace-nowrap ${i === step ? 'text-[#00502e] font-medium' : 'text-[#8A7E6E]'}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-2 mb-5 ${i < step ? 'bg-[#00502e]' : 'bg-[#bec9bf]/40'}`} />}
          </div>
        ))}
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="bg-white rounded-xl border border-[#bec9bf]/40 p-6">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-medium text-[#221a0f] mb-4">Cargo Details</h2>
            <Input label="HS Code *" placeholder="e.g. 0901.21" value={form.hsCode} onChange={(e) => set('hsCode', e.target.value)} />
            <div>
              <label className="block text-sm font-medium text-[#221a0f] mb-1.5">Cargo Description *</label>
              <textarea rows={3} className="w-full rounded-lg border border-[#bec9bf]/60 px-3 py-2.5 text-sm text-[#221a0f] placeholder-[#8A7E6E] focus:outline-none focus:ring-2 focus:ring-[#00502e]/30 focus:border-[#00502e] resize-none"
                placeholder="Describe the goods being exported" value={form.cargoDescription} onChange={(e) => set('cargoDescription', e.target.value)} />
            </div>
            <Input label="Cargo Weight (kg) *" type="number" placeholder="e.g. 1000" value={form.cargoWeight} onChange={(e) => set('cargoWeight', e.target.value)} />
            <div>
              <label className="block text-sm font-medium text-[#221a0f] mb-1.5">Shipping Method *</label>
              <select className="w-full rounded-lg border border-[#bec9bf]/60 px-3 py-2.5 text-sm text-[#221a0f] focus:outline-none focus:ring-2 focus:ring-[#00502e]/30 focus:border-[#00502e]"
                value={form.shippingMethod} onChange={(e) => set('shippingMethod', e.target.value as NewECertPayload['shippingMethod'])}>
                {SHIPPING_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.isExpedited} onChange={(e) => set('isExpedited', e.target.checked)} className="w-4 h-4 rounded border-[#bec9bf] text-[#00502e] focus:ring-[#00502e]/30" />
              <span className="text-sm text-[#221a0f]">Expedited processing <span className="text-[#8A7E6E]">(additional fee applies)</span></span>
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-medium text-[#221a0f] mb-4">Parties & Route</h2>
            <Input label="Destination Country *" placeholder="e.g. United States" value={form.destinationCountry} onChange={(e) => set('destinationCountry', e.target.value)} />
            <Input label="Destination Port" placeholder="e.g. Port of New York" value={form.destinationPort} onChange={(e) => set('destinationPort', e.target.value)} />
            <Input label="Exporter Name *" placeholder="Your company name" value={form.exporterName} onChange={(e) => set('exporterName', e.target.value)} />
            <div>
              <label className="block text-sm font-medium text-[#221a0f] mb-1.5">Exporter Address *</label>
              <textarea rows={2} className="w-full rounded-lg border border-[#bec9bf]/60 px-3 py-2.5 text-sm text-[#221a0f] placeholder-[#8A7E6E] focus:outline-none focus:ring-2 focus:ring-[#00502e]/30 focus:border-[#00502e] resize-none"
                placeholder="Full business address" value={form.exporterAddress} onChange={(e) => set('exporterAddress', e.target.value)} />
            </div>
            <Input label="Consignee Name" placeholder="Recipient company name" value={form.consigneeName} onChange={(e) => set('consigneeName', e.target.value)} />
            <div>
              <label className="block text-sm font-medium text-[#221a0f] mb-1.5">Consignee Address</label>
              <textarea rows={2} className="w-full rounded-lg border border-[#bec9bf]/60 px-3 py-2.5 text-sm text-[#221a0f] placeholder-[#8A7E6E] focus:outline-none focus:ring-2 focus:ring-[#00502e]/30 focus:border-[#00502e] resize-none"
                value={form.consigneeAddress} onChange={(e) => set('consigneeAddress', e.target.value)} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="mb-4">
              <h2 className="font-medium text-[#221a0f]">Supporting Documents</h2>
              <p className="text-xs text-[#8A7E6E] mt-1">Select from your library or upload new files. Both are optional — you can attach documents later.</p>
            </div>
            <DocSlot label="Commercial Invoice" filterCategory="commercial_invoice" selectedDocId={commercialInvoiceDocId} selectedFile={commercialInvoiceFile} onSelectDocId={setCommercialInvoiceDocId} onSelectFile={setCommercialInvoiceFile} />
            <DocSlot label="Packing List" filterCategory="packing_list" selectedDocId={packingListDocId} selectedFile={packingListFile} onSelectDocId={setPackingListDocId} onSelectFile={setPackingListFile} />
            {(commercialInvoiceDocId || commercialInvoiceFile || packingListDocId || packingListFile) && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-xs text-green-700">
                {[(commercialInvoiceDocId || commercialInvoiceFile) && 'Commercial Invoice attached', (packingListDocId || packingListFile) && 'Packing List attached'].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-medium text-[#221a0f] mb-4">Review Your Application</h2>
            <dl className="divide-y divide-[#bec9bf]/30 rounded-lg border border-[#bec9bf]/40 overflow-hidden">
              {[
                { label: 'HS Code', value: form.hsCode },
                { label: 'Cargo Description', value: form.cargoDescription },
                { label: 'Weight', value: form.cargoWeight ? `${form.cargoWeight} kg` : '—' },
                { label: 'Shipping Method', value: SHIPPING_METHODS.find((m) => m.value === form.shippingMethod)?.label ?? form.shippingMethod },
                { label: 'Destination', value: [form.destinationCountry, form.destinationPort].filter(Boolean).join(', ') || '—' },
                { label: 'Exporter', value: form.exporterName },
                { label: 'Consignee', value: form.consigneeName || '—' },
                { label: 'Expedited', value: form.isExpedited ? 'Yes (+₦10,000)' : 'No' },
                { label: 'Commercial Invoice', value: commercialInvoiceFile?.name ?? (commercialInvoiceDocId ? 'From library' : '—') },
                { label: 'Packing List', value: packingListFile?.name ?? (packingListDocId ? 'From library' : '—') },
              ].map((row) => (
                <div key={row.label} className="grid grid-cols-3 gap-4 px-4 py-3">
                  <dt className="text-sm text-[#8A7E6E]">{row.label}</dt>
                  <dd className="col-span-2 text-sm text-[#221a0f]">{row.value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-[#8A7E6E]">By submitting, you confirm that all information is accurate and complete.</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-6">
        <Button variant="outline" onClick={() => step === 0 ? navigate('/dashboard/eco') : setStep((s) => s - 1)}>
          {step === 0 ? 'Cancel' : 'Back'}
        </Button>

        <div className="flex items-center gap-3">
          {/* Save Draft button — visible on steps 0–2 */}
          {step < 3 && (
            <Button
              variant="outline"
              loading={isSavingDraft || isUpdating}
              onClick={handleSaveDraft}
            >
              Save Draft
            </Button>
          )}

          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)}
              disabled={(step === 0 && !canContinueStep0) || (step === 1 && !canContinueStep1)}>
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
