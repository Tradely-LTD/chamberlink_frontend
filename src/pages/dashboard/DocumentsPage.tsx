import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as SelectPrimitive from '@radix-ui/react-select';
import {
  useGetDocumentsQuery, useUploadDocumentMutation, useDeleteDocumentMutation, usePatchDocumentCategoryMutation,
} from '@features/documents';
import type { Document, DocumentCategory } from '@features/documents';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { Button } from '@shared/ui/Button';
import { Select } from '@shared/ui/Select';
import { isNoActiveChamberError } from '@shared/utils';

export type { DocumentCategory };

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  commercial_invoice:   'Commercial Invoice',
  packing_list:         'Packing List',
  certificate_of_origin:'Certificate of Origin',
  membership_card:      'Membership Card',
  business_registration:'Business Registration',
  tax_clearance:        'Tax Clearance',
  export_permit:        'Export Permit',
  signature:            'Signature',
  cac_certificate:      'CAC Certificate',
  nepc_certificate:     'NEPC Certificate',
  other:                'Other',
};

const CATEGORY_COLORS: Record<DocumentCategory, { bg: string; text: string }> = {
  commercial_invoice:    { bg: '#d6e3ff', text: '#023293' },
  packing_list:          { bg: '#a0f4ca', text: '#005137' },
  certificate_of_origin: { bg: '#ffdea5', text: '#5d4201' },
  membership_card:       { bg: '#e8d5f5', text: '#3d1060' },
  business_registration: { bg: '#e0e3e5', text: '#44474e' },
  tax_clearance:         { bg: '#fce4ec', text: '#880e4f' },
  export_permit:         { bg: '#e0f2fe', text: '#01579b' },
  signature:             { bg: '#fff3c4', text: '#7a5c00' },
  cac_certificate:       { bg: '#d1f5ea', text: '#00695c' },
  nepc_certificate:      { bg: '#e3d9ff', text: '#4527a0' },
  other:                 { bg: '#f5f5f5', text: '#616161' },
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getDocIcon = (type: string) => {
  if (type.includes('pdf')) return '📄';
  if (type.includes('image')) return '🖼️';
  return '📁';
};

function UploadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [uploadDoc, { isLoading }] = useUploadDocumentMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docName, setDocName] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('other');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only PDF and image files (JPEG, PNG, WebP) are allowed.');
      return;
    }
    setError(null);
    setSelectedFile(file);
    if (!docName) setDocName(file.name.replace(/\.[^/.]+$/, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) { setError('Please select a file.'); return; }
    if (!docName.trim()) { setError('Please enter a document name.'); return; }
    setError(null);
    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('name', docName.trim());
    formData.append('category', category);
    try {
      await uploadDoc(formData).unwrap();
      onSuccess();
    } catch {
      setError('Upload failed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-ink">Upload Document</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-alt text-ink-subtle">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <ErrorBanner message={error} />}
          <div>
            <label className="block text-xs font-semibold text-ink-subtle mb-1">Document Name <span className="text-red-500">*</span></label>
            <input type="text" required value={docName} onChange={(e) => setDocName(e.target.value)}
              placeholder="e.g. Business Registration Certificate"
              className="w-full rounded-lg border border-border/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>
          <Select label="Category" value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}
            options={(Object.keys(CATEGORY_LABELS) as DocumentCategory[]).map((k) => ({ value: k, label: CATEGORY_LABELS[k] }))} />
          <div>
            <label className="block text-xs font-semibold text-ink-subtle mb-1">File <span className="text-red-500">*</span></label>
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFileSelect} />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-border/60 px-4 py-6 text-center hover:border-primary transition-colors">
              {selectedFile ? (
                <div className="text-sm text-ink">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-ink-subtle mt-0.5">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                </div>
              ) : (
                <div>
                  <svg className="w-6 h-6 mx-auto text-ink-subtle mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <p className="text-sm text-ink-subtle">Click to select file</p>
                  <p className="text-xs text-ink-subtle mt-0.5">PDF, JPEG, PNG, or WebP · Max 10MB</p>
                </div>
              )}
            </button>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={isLoading} className="flex-1 bg-primary hover:bg-primary-hover text-white">Upload</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CategoryBadge({ docId, category, readonly }: { docId: string; category: DocumentCategory; readonly?: boolean }) {
  const [patchCategory] = usePatchDocumentCategoryMutation();
  const [editing, setEditing] = useState(false);
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other;

  if (readonly) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
        style={{ background: colors.bg, color: colors.text }}>
        {CATEGORY_LABELS[category] ?? category}
      </span>
    );
  }

  if (editing) {
    return (
      <SelectPrimitive.Root
        defaultOpen
        value={category}
        onValueChange={async (v) => {
          await patchCategory({ id: docId, category: v as DocumentCategory });
          setEditing(false);
        }}
        onOpenChange={(open) => { if (!open) setEditing(false); }}
      >
        <SelectPrimitive.Trigger
          className="inline-flex items-center gap-1 text-xs rounded-lg border border-border/60 px-2 py-1 outline-none focus:ring-2 focus:ring-primary/30"
          onClick={(e) => e.stopPropagation()}
        >
          <SelectPrimitive.Value />
          <SelectPrimitive.Icon>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>expand_more</span>
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className="z-50 overflow-hidden rounded-lg border border-border bg-white shadow-card-hover"
          >
            <SelectPrimitive.Viewport className="p-1">
              {(Object.keys(CATEGORY_LABELS) as DocumentCategory[]).map((k) => (
                <SelectPrimitive.Item
                  key={k}
                  value={k}
                  className="relative flex items-center rounded-md px-3 py-1.5 pl-7 text-xs text-ink outline-none cursor-pointer select-none data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary"
                >
                  <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 14 }}>check</span>
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText>{CATEGORY_LABELS[k]}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="Click to change category"
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium hover:opacity-80 transition-opacity cursor-pointer"
      style={{ background: colors.bg, color: colors.text }}>
      {CATEGORY_LABELS[category] ?? category}
      <svg className="w-3 h-3 ml-1 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    </button>
  );
}

function DeleteButton({ docId, docName }: { docId: string; docName: string }) {
  const [deleteDoc, { isLoading }] = useDeleteDocumentMutation();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs text-ink-subtle">Delete?</span>
        <button
          disabled={isLoading}
          onClick={async () => {
            setError(null);
            try {
              await deleteDoc(docId).unwrap();
            } catch (err: unknown) {
              const msg = (err as { data?: { message?: string } })?.data?.message ?? 'Delete failed.';
              setError(msg);
              setConfirming(false);
            }
          }}
          className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          {isLoading ? '…' : 'Yes'}
        </button>
        <button onClick={() => setConfirming(false)} className="text-xs font-medium text-ink-subtle">No</button>
        {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
      title={`Delete ${docName}`}
      className="p-1 rounded-md text-ink-subtle hover:text-red-500 hover:bg-red-50 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  );
}

// Exported so ExportDocumentsPage can embed it as a tab
export function DocumentLibraryView() {
  const { data: docs, isLoading, isError, error } = useGetDocumentsQuery();
  const [showUpload, setShowUpload] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const noConnection = isNoActiveChamberError(error);

  const documents = docs ?? [];

  if (!isLoading && noConnection) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-[#f7f9f7] p-8 text-center">
        <p className="text-sm font-semibold text-ink mb-1">You&apos;re not connected to a chamber yet</p>
        <p className="text-sm text-ink-subtle mb-4">Connect to a chamber to upload and manage your documents.</p>
        <Link to="/dashboard/connections" className="text-sm font-medium text-primary hover:underline">
          Connect a chamber
        </Link>
      </div>
    );
  }

  const handleSuccess = () => {
    setShowUpload(false);
    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 4000);
  };

  const isSystemDoc = (doc: Document) =>
    doc.id.startsWith('card-') || doc.category === 'certificate_of_origin' || doc.category === 'membership_card';

  return (
    <>
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={handleSuccess} />}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <p className="text-sm text-ink-subtle">
          Upload supporting files (business registration, tax clearance, export permits, etc.) and access them when applying for eCO certificates.
        </p>
        <div className="flex-shrink-0">
          <Button variant="outline" onClick={() => setShowUpload(true)}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload File
          </Button>
        </div>
      </div>

      {uploadSuccess && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Document uploaded successfully.
        </div>
      )}
      {isLoading && <SkeletonCard />}
      {isError && <ErrorBanner message="Failed to load documents." />}

      <div className="bg-white rounded-xl border border-border/40 overflow-hidden">
        {/* Desktop table header — hidden on mobile */}
        <div className="hidden sm:grid grid-cols-12 gap-3 px-5 py-3 border-b border-border/40 text-xs font-medium text-ink-subtle uppercase tracking-wide">
          <span className="col-span-5">Document</span>
          <span className="col-span-3">Category</span>
          <span className="col-span-2">Size</span>
          <span className="col-span-2">Date</span>
        </div>

        {documents.length === 0 && !isLoading ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-ink-subtle mb-4">No documents yet.</p>
            <Button variant="outline" onClick={() => setShowUpload(true)}>Upload your first document</Button>
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="border-b border-border/20 last:border-0 hover:bg-surface-alt transition-colors">
              {/* Desktop row */}
              <div className="hidden sm:grid grid-cols-12 gap-3 px-5 py-4 items-center">
                <div className="col-span-5 flex items-center gap-3 min-w-0">
                  <span className="text-xl flex-shrink-0">{getDocIcon(doc.type)}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{doc.name}</p>
                    <p className="text-xs text-ink-subtle uppercase">{doc.type.split('/')[1] ?? doc.type}</p>
                  </div>
                </div>
                <div className="col-span-3">
                  <CategoryBadge docId={doc.id} category={doc.category ?? 'other'} readonly={isSystemDoc(doc)} />
                </div>
                <span className="col-span-2 text-sm text-ink-subtle">{formatBytes(doc.size)}</span>
                <div className="col-span-2 flex items-center justify-between">
                  <span className="text-sm text-ink-subtle">
                    {new Date(doc.uploadedAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-1">
                    {doc.url && (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer"
                        className="p-1 rounded-md text-primary hover:bg-[#f0faf4] transition-colors" title="Download">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                    )}
                    {!isSystemDoc(doc) && <DeleteButton docId={doc.id} docName={doc.name} />}
                  </div>
                </div>
              </div>

              {/* Mobile card */}
              <div className="sm:hidden px-4 py-4 flex items-start gap-3">
                <span className="text-2xl flex-shrink-0 mt-0.5">{getDocIcon(doc.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{doc.name}</p>
                  <p className="text-xs text-ink-subtle uppercase mt-0.5">{doc.type.split('/')[1] ?? doc.type}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <CategoryBadge docId={doc.id} category={doc.category ?? 'other'} readonly={isSystemDoc(doc)} />
                    <span className="text-xs text-ink-subtle">{formatBytes(doc.size)}</span>
                    <span className="text-xs text-ink-subtle">
                      {new Date(doc.uploadedAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {doc.url && (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-md text-primary hover:bg-[#f0faf4] transition-colors" title="Download">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  )}
                  {!isSystemDoc(doc) && <DeleteButton docId={doc.id} docName={doc.name} />}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

export function DocumentsPage() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Document Library</h1>
        <p className="text-sm text-ink-subtle mt-0.5">Your certificates, registrations, and official documents.</p>
      </div>
      <DocumentLibraryView />
    </div>
  );
}
