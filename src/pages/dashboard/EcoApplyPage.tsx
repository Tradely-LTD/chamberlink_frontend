import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  useCreateEcoCertificateMutation,
  useCreateEcoCertificateWithFilesMutation,
  useSaveDraftEcoMutation,
  useUpdateEcoDraftMutation,
  useSubmitEcoDraftMutation,
  useGetEcoCertificateQuery,
  useGetEcoChambersQuery,
} from '@features/eco/ecoApi';
import type { NewECertPayload } from '@features/eco/ecoApi';
import { Input } from '@shared/ui/Input';
import { Button } from '@shared/ui/Button';
import { ErrorBanner } from '@shared/ui/ErrorBanner';

const STEPS = ['Product Details', 'Company Details', 'Commercial Information', 'Compliance', 'Review & Submit'];

const CHAMBER_MEMBER_FEE = 0.11;
const NON_CHAMBER_MEMBER_FEE = 0.125;
const fmtFee = (n: number) => `₦${n.toFixed(3).replace(/0$/, '')}`;

function FileSlot({ label, hint, file, onSelect }: {
  label: string; hint?: string; file: File | null; onSelect: (file: File | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-xl border border-[#bec9bf]/40 overflow-hidden">
      <div className="px-4 py-3 bg-[#fdf8f3] border-b border-[#bec9bf]/30">
        <p className="text-sm font-medium text-[#221a0f]">{label}</p>
        {hint && <p className="text-xs text-[#8A7E6E] mt-0.5">{hint}</p>}
      </div>
      <div className="p-4">
        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => onSelect(e.target.files?.[0] ?? null)} />
        <button type="button" onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-lg border-2 border-dashed border-[#bec9bf]/60 px-4 py-5 text-center hover:border-[#023293] transition-colors">
          {file ? (
            <div><p className="text-sm font-medium text-[#221a0f]">{file.name}</p><p className="text-xs text-[#8A7E6E] mt-0.5">{(file.size / 1024).toFixed(0)} KB</p></div>
          ) : (
            <div>
              <svg className="w-5 h-5 mx-auto text-[#8A7E6E] mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              <p className="text-sm text-[#8A7E6E]">Click to select file</p>
              <p className="text-xs text-[#8A7E6E] mt-0.5">PDF, JPEG, PNG · Max 10MB</p>
            </div>
          )}
        </button>
        {file && <button onClick={() => onSelect(null)} className="mt-2 text-xs text-[#8A7E6E] hover:text-[#221a0f]">Remove</button>}
      </div>
    </div>
  );
}

export function EcoApplyPage() {
  const navigate = useNavigate();
  const { certId } = useParams<{ certId?: string }>();
  const isEditing = !!certId;

  const { data: existingCert } = useGetEcoCertificateQuery(certId ?? '', { skip: !certId });
  const { data: chambers = [] } = useGetEcoChambersQuery();

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
    solidMineralName: '', descriptionOfGoods: '', originOfGoods: '', destinationCountry: '', batchIdNo: '',
    isLicenseOwner: false, miningLicenseNo: '', companyName: '', companyAddress: '', companyEmail: '', companyPhone: '',
    invoiceTotal: '', isChamberMember: false, membershipId: '', chamberOfCommerceId: '',
  });

  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [cacFile, setCacFile] = useState<File | null>(null);
  const [nepcFile, setNepcFile] = useState<File | null>(null);

  // Pre-populate form when editing existing draft/revision_requested
  useEffect(() => {
    if (!existingCert) return;
    setForm({
      solidMineralName: existingCert.solidMineralName ?? '',
      descriptionOfGoods: existingCert.descriptionOfGoods ?? '',
      originOfGoods: existingCert.originOfGoods ?? '',
      destinationCountry: existingCert.destinationCountry ?? '',
      batchIdNo: existingCert.batchIdNo ?? '',
      isLicenseOwner: existingCert.isLicenseOwner ?? false,
      miningLicenseNo: existingCert.miningLicenseNo ?? '',
      companyName: existingCert.companyName ?? '',
      companyAddress: existingCert.companyAddress ?? '',
      companyEmail: existingCert.companyEmail ?? '',
      companyPhone: existingCert.companyPhone ?? '',
      invoiceTotal: existingCert.invoiceTotal ? String(existingCert.invoiceTotal) : '',
      isChamberMember: existingCert.isChamberMember ?? false,
      membershipId: existingCert.membershipId ?? '',
      chamberOfCommerceId: existingCert.chamberOfCommerceId ?? '',
    });
  }, [existingCert]);

  // Default the chamber dropdown to the first option once loaded
  useEffect(() => {
    if (chambers.length > 0 && !form.chamberOfCommerceId) {
      setForm((f) => ({ ...f, chamberOfCommerceId: chambers[0].id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chambers]);

  const set = <K extends keyof typeof form>(field: K, value: typeof form[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const buildFormDataOrJson = () => {
    const hasFiles = !!(invoiceFile || signatureFile || cacFile || nepcFile);
    const jsonBody: Partial<NewECertPayload> = {
      solidMineralName: form.solidMineralName || undefined,
      descriptionOfGoods: form.descriptionOfGoods || undefined,
      originOfGoods: form.originOfGoods || undefined,
      destinationCountry: form.destinationCountry || undefined,
      batchIdNo: form.batchIdNo || undefined,
      isLicenseOwner: form.isLicenseOwner,
      miningLicenseNo: form.miningLicenseNo || undefined,
      companyName: form.companyName || undefined,
      companyAddress: form.companyAddress || undefined,
      companyEmail: form.companyEmail || undefined,
      companyPhone: form.companyPhone || undefined,
      invoiceTotal: form.invoiceTotal ? parseFloat(form.invoiceTotal) : undefined,
      isChamberMember: form.isChamberMember,
      membershipId: form.membershipId || undefined,
      chamberOfCommerceId: form.chamberOfCommerceId || undefined,
    };

    if (!hasFiles) return { isFormData: false, body: jsonBody };

    const fd = new FormData();
    const append = (k: string, v: string | boolean | number | undefined) => { if (v !== undefined && v !== '') fd.append(k, String(v)); };
    Object.entries(jsonBody).forEach(([k, v]) => append(k, v as string | boolean | number | undefined));
    if (invoiceFile) fd.append('invoice', invoiceFile);
    if (signatureFile) fd.append('signature', signatureFile);
    if (cacFile) fd.append('cac', cacFile);
    if (nepcFile) fd.append('nepc', nepcFile);
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
        const res = await saveDraftEco(isFormData ? body as FormData : body).unwrap();
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
  const canContinueStep0 = !!(form.solidMineralName && form.descriptionOfGoods && form.originOfGoods && form.destinationCountry);
  const canContinueStep1 = !!(form.companyName && form.companyAddress && (!form.isLicenseOwner || form.miningLicenseNo));
  const canContinueStep2 = !!(form.invoiceTotal && form.chamberOfCommerceId && (!form.isChamberMember || form.membershipId));
  const canContinue = [canContinueStep0, canContinueStep1, canContinueStep2, true][step];

  const fee = form.isChamberMember ? CHAMBER_MEMBER_FEE : NON_CHAMBER_MEMBER_FEE;
  const chamberName = chambers.find((c) => c.id === form.chamberOfCommerceId)?.name;

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
      <p className="text-sm text-[#8A7E6E] mb-2">Solid Minerals Certificate of Origin — complete all required fields to submit your application.</p>

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
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${i <= step ? 'bg-[#023293] text-white' : 'bg-[#bec9bf]/30 text-[#8A7E6E]'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1 whitespace-nowrap ${i === step ? 'text-[#023293] font-medium' : 'text-[#8A7E6E]'}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-2 mb-5 ${i < step ? 'bg-[#023293]' : 'bg-[#bec9bf]/40'}`} />}
          </div>
        ))}
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="bg-white rounded-xl border border-[#bec9bf]/40 p-6">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-medium text-[#221a0f] mb-4">Product Details</h2>
            <Input label="Solid Mineral Name *" placeholder="e.g. Tantalite" value={form.solidMineralName} onChange={(e) => set('solidMineralName', e.target.value)} />
            <div>
              <label className="block text-sm font-medium text-[#221a0f] mb-1.5">Description of Goods: Quality *</label>
              <textarea rows={3} className="w-full rounded-lg border border-[#bec9bf]/60 px-3 py-2.5 text-sm text-[#221a0f] placeholder-[#8A7E6E] focus:outline-none focus:ring-2 focus:ring-[#023293]/30 focus:border-[#023293] resize-none"
                placeholder="Describe the quality/grade of the goods being exported" value={form.descriptionOfGoods} onChange={(e) => set('descriptionOfGoods', e.target.value)} />
            </div>
            <Input label="Origin of Goods *" placeholder="e.g. Jos, Plateau State" value={form.originOfGoods} onChange={(e) => set('originOfGoods', e.target.value)} />
            <Input label="Destination Country *" placeholder="e.g. China" value={form.destinationCountry} onChange={(e) => set('destinationCountry', e.target.value)} />
            <Input label="Batch ID/No" placeholder="Optional" value={form.batchIdNo} onChange={(e) => set('batchIdNo', e.target.value)} />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-medium text-[#221a0f] mb-4">Company Details</h2>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.isLicenseOwner} onChange={(e) => set('isLicenseOwner', e.target.checked)} className="w-4 h-4 rounded border-[#bec9bf] text-[#023293] focus:ring-[#023293]/30" />
              <span className="text-sm text-[#221a0f]">Are you a license owner?</span>
            </label>
            {form.isLicenseOwner && (
              <Input label="Mining License No *" placeholder="License number" value={form.miningLicenseNo} onChange={(e) => set('miningLicenseNo', e.target.value)} />
            )}
            <Input label="Company Name *" placeholder="Your company name" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} />
            <div>
              <label className="block text-sm font-medium text-[#221a0f] mb-1.5">Address *</label>
              <textarea rows={2} className="w-full rounded-lg border border-[#bec9bf]/60 px-3 py-2.5 text-sm text-[#221a0f] placeholder-[#8A7E6E] focus:outline-none focus:ring-2 focus:ring-[#023293]/30 focus:border-[#023293] resize-none"
                placeholder="Full business address" value={form.companyAddress} onChange={(e) => set('companyAddress', e.target.value)} />
            </div>
            <Input label="Email" type="email" placeholder="company@example.com" value={form.companyEmail} onChange={(e) => set('companyEmail', e.target.value)} />
            <Input label="Phone No" placeholder="e.g. 08012345678" value={form.companyPhone} onChange={(e) => set('companyPhone', e.target.value)} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-medium text-[#221a0f] mb-4">Commercial Information</h2>
            <Input label="Invoice Total (₦) *" type="number" placeholder="e.g. 500000" value={form.invoiceTotal} onChange={(e) => set('invoiceTotal', e.target.value)} />
            <FileSlot label="Attach Invoice" file={invoiceFile} onSelect={setInvoiceFile} />

            <div>
              <label className="block text-sm font-medium text-[#221a0f] mb-1.5">From which Chamber of Commerce *</label>
              <select className="w-full rounded-lg border border-[#bec9bf]/60 px-3 py-2.5 text-sm text-[#221a0f] focus:outline-none focus:ring-2 focus:ring-[#023293]/30 focus:border-[#023293]"
                value={form.chamberOfCommerceId} onChange={(e) => set('chamberOfCommerceId', e.target.value)}>
                {chambers.length === 0 && <option value="">No chambers available</option>}
                {chambers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.isChamberMember} onChange={(e) => set('isChamberMember', e.target.checked)} className="w-4 h-4 rounded border-[#bec9bf] text-[#023293] focus:ring-[#023293]/30" />
              <span className="text-sm text-[#221a0f]">Are you a member of any chamber?</span>
            </label>
            {form.isChamberMember && (
              <Input label="Membership ID *" placeholder="e.g. KAC-2024-001" value={form.membershipId} onChange={(e) => set('membershipId', e.target.value)} />
            )}

            <div className="rounded-lg bg-[#fdf8f3] border border-[#bec9bf]/40 px-4 py-3 text-sm text-[#221a0f]">
              Application fee: <span className="font-semibold">{fmtFee(fee)}</span>
              <span className="text-xs text-[#8A7E6E]"> — {form.isChamberMember ? 'chamber member rate' : 'non-member rate'}</span>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-medium text-[#221a0f] mb-4">Compliance</h2>
            <FileSlot label="Attach Signature" file={signatureFile} onSelect={setSignatureFile} />
            <FileSlot label="Attach CAC" hint="Corporate Affairs Commission certificate" file={cacFile} onSelect={setCacFile} />
            <FileSlot label="Attach NEPC" hint="Nigerian Export Promotion Council certificate" file={nepcFile} onSelect={setNepcFile} />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-medium text-[#221a0f] mb-4">Review Your Application</h2>
            <dl className="divide-y divide-[#bec9bf]/30 rounded-lg border border-[#bec9bf]/40 overflow-hidden">
              {[
                { label: 'Solid Mineral', value: form.solidMineralName },
                { label: 'Description (Quality)', value: form.descriptionOfGoods },
                { label: 'Origin of Goods', value: form.originOfGoods },
                { label: 'Destination Country', value: form.destinationCountry },
                { label: 'Batch ID/No', value: form.batchIdNo || '—' },
                { label: 'License Owner', value: form.isLicenseOwner ? `Yes — ${form.miningLicenseNo || '—'}` : 'No' },
                { label: 'Company Name', value: form.companyName },
                { label: 'Company Address', value: form.companyAddress },
                { label: 'Invoice Total', value: form.invoiceTotal ? `₦${Number(form.invoiceTotal).toLocaleString()}` : '—' },
                { label: 'Chamber of Commerce', value: chamberName ?? '—' },
                { label: 'Chamber Member', value: form.isChamberMember ? `Yes — ${form.membershipId || '—'}` : 'No' },
                { label: 'Application Fee', value: fmtFee(fee) },
                { label: 'Invoice', value: invoiceFile?.name ?? '—' },
                { label: 'Signature', value: signatureFile?.name ?? '—' },
                { label: 'CAC', value: cacFile?.name ?? '—' },
                { label: 'NEPC', value: nepcFile?.name ?? '—' },
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
          {/* Save Draft button — visible on steps 0–3 */}
          {step < 4 && (
            <Button
              variant="outline"
              loading={isSavingDraft || isUpdating}
              onClick={handleSaveDraft}
            >
              Save Draft
            </Button>
          )}

          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
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
