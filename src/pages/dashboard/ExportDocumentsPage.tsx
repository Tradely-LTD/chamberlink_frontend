import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { Button } from '@shared/ui/Button';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import {
  useGetMyExportDocsQuery,
  useCreateExportDocMutation,
  useDownloadExportDocMutation,
  useGetAllExportDocsQuery,
  useAdvanceToProcessingMutation,
  useMarkReadyMutation,
  useDeleteExportDocMutation,
} from '@features/export-documents';
import type { DocType, ExportDocument } from '@features/export-documents';
import { DocumentLibraryView } from '@pages/dashboard/DocumentsPage';

// ── Config ─────────────────────────────────────────────────────────────────

const docTypeConfig: Record<DocType, { label: string; icon: string; bg: string; text: string }> = {
  commercial_invoice:   { label: 'Commercial Invoice',   icon: 'receipt_long',      bg: '#d6e3ff', text: '#001b3d' },
  packing_list:         { label: 'Packing List',         icon: 'inventory_2',       bg: '#a0f4ca', text: '#005137' },
  combined_certificate: { label: 'Combined Certificate', icon: 'workspace_premium', bg: '#ffdea5', text: '#5d4201' },
  export_declaration:   { label: 'Export Declaration',   icon: 'fact_check',        bg: '#e0e3e5', text: '#44474e' },
  phytosanitary:        { label: 'Phytosanitary Cert',   icon: 'eco',               bg: '#a0f4ca', text: '#005137' },
};

const docStatusConfig: Record<ExportDocument['status'], { label: string; bg: string; text: string }> = {
  draft:      { label: 'Draft',      bg: '#e0e3e5', text: '#44474e' },
  processing: { label: 'Processing', bg: '#ffdea5', text: '#5d4201' },
  ready:      { label: 'Ready',      bg: '#a0f4ca', text: '#005137' },
  downloaded: { label: 'Downloaded', bg: '#d6e3ff', text: '#001b3d' },
};

const ADMIN_ROLES = ['chamber_admin', 'kaccima_executive', 'super_admin', 'staff_operator'];

// Self-service types (Commercial Invoice, Packing List) are handled by the generator page.
// The admin-queue modal only covers types that still require admin processing.
const ADMIN_QUEUE_TYPES: DocType[] = ['export_declaration', 'phytosanitary', 'combined_certificate'];

// ── Create Document Modal ─────────────────────────────────────────────────

function CreateDocModal({ onClose }: { onClose: () => void }) {
  const [createDoc, { isLoading }] = useCreateExportDocMutation();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{
    type: DocType;
    consignee: string;
    destinationCountry: string;
    products: string;
  }>({
    type: 'export_declaration',
    consignee: '',
    destinationCountry: '',
    products: '',
  });

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    try {
      await createDoc(form).unwrap();
      onClose();
    } catch {
      setError('Failed to create document. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="border-b border-[#e0e3e5] px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-[#191c1e]">Generate Export Document</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#f7f9fb] text-[#74777f]"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <ErrorBanner message={error} />}
          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">Document Type</label>
            <select
              value={form.type}
              onChange={set('type')}
              className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none"
            >
              {ADMIN_QUEUE_TYPES.map((k) => (
                <option key={k} value={k}>{docTypeConfig[k].label}</option>
              ))}
            </select>
          </div>
          {(
            [
              { label: 'Consignee (Buyer)', key: 'consignee' as const, placeholder: 'e.g. Guangzhou Import Co. Ltd' },
              { label: 'Destination Country', key: 'destinationCountry' as const, placeholder: 'e.g. China' },
            ] as const
          ).map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">{label}</label>
              <input
                required
                value={form[key]}
                onChange={set(key)}
                placeholder={placeholder}
                className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#002046]"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">Products &amp; Quantities</label>
            <textarea
              required
              rows={3}
              value={form.products}
              onChange={set('products')}
              placeholder="e.g. Wet Blue Hides (500 pcs), Finished Leather (200 sqm)"
              className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#002046] resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#002046' }}
            >
              {isLoading ? 'Generating…' : 'Generate Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Mark Ready Modal ──────────────────────────────────────────────────────

interface MarkReadyModalProps {
  docId: string;
  onClose: () => void;
}

function MarkReadyModal({ docId, onClose }: MarkReadyModalProps) {
  const [markReady, { isLoading }] = useMarkReadyMutation();
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!file) {
      setError('Please select a document file (PDF, JPEG, or PNG).');
      return;
    }
    setError(null);
    try {
      await markReady({ id: docId, document: file, notes: notes || undefined }).unwrap();
      onClose();
    } catch {
      setError('Failed to upload document. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-[#e0e3e5] px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-[#191c1e]">Upload &amp; Mark Ready</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#f7f9fb] text-[#74777f]"
            disabled={isLoading}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <ErrorBanner message={error} />}

          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">
              Document File <span className="text-red-500">*</span>
            </label>
            <div
              className="border-2 border-dashed border-[#c4c6cf] rounded-lg p-4 text-center cursor-pointer hover:border-[#002046] transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm text-[#191c1e]">
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#0b6c4b' }}>check_circle</span>
                  <span className="font-medium truncate max-w-[220px]">{file.name}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="material-symbols-outlined text-[#74777f]" style={{ fontSize: 28 }}>upload_file</span>
                  <p className="text-sm text-[#74777f]">Click to select file</p>
                  <p className="text-xs text-[#9a9da5]">PDF, JPEG, or PNG — max 10 MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">Notes (optional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes for the member…"
              className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#002046] resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <button
              type="submit"
              disabled={isLoading || !file}
              className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#0b6c4b' }}
            >
              {isLoading ? 'Uploading…' : 'Upload & Mark Ready'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Member View ────────────────────────────────────────────────────────────

function MemberExportDocsView() {
  const navigate = useNavigate();
  const { data: docs, isLoading, isError } = useGetMyExportDocsQuery();
  const [downloadDoc, { isLoading: downloading }] = useDownloadExportDocMutation();
  const [deleteDoc] = useDeleteExportDocMutation();
  const [mainTab, setMainTab] = useState<'generated' | 'library'>('generated');
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | ExportDocument['status']>('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = (docs ?? []).filter(
    (d) => statusFilter === 'all' || d.status === statusFilter,
  );

  const getDocUrl = async (doc: ExportDocument): Promise<string | null> => {
    if (doc.downloadUrl) return doc.downloadUrl;
    try {
      const result = await downloadDoc(doc.id).unwrap();
      return result.downloadUrl;
    } catch {
      return null;
    }
  };

  const handleView = async (doc: ExportDocument) => {
    setDownloadingId(doc.id);
    const url = await getDocUrl(doc);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
    setDownloadingId(null);
  };

  const handleDownload = async (doc: ExportDocument) => {
    setDownloadingId(doc.id);
    const url = await getDocUrl(doc);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.referenceNo}.pdf`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setDownloadingId(null);
  };

  const handleDelete = async (docId: string) => {
    setDeletingId(docId);
    try {
      await deleteDoc(docId).unwrap();
    } catch {
      // silent — list will not change if failed
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      {showCreate && <CreateDocModal onClose={() => setShowCreate(false)} />}

      {/* Page header — stacks on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#191c1e]">Export Documents</h2>
          <p className="text-sm text-[#74777f] mt-0.5">Generate trade documents and manage your file library.</p>
        </div>
        {mainTab === 'generated' && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate('/dashboard/export-documents/generate')}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white"
              style={{ background: '#00502e' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>receipt_long</span>
              <span className="hidden sm:inline">Generate Invoice / Packing List</span>
              <span className="sm:hidden">Generate</span>
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold border border-[#c4c6cf] text-[#191c1e] hover:border-[#002046] transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
              <span className="hidden sm:inline">Other Document</span>
              <span className="sm:hidden">Other</span>
            </button>
          </div>
        )}
      </div>

      {/* Main tabs: Generated | Document Library */}
      <div className="flex gap-1 bg-[#f7f9fb] rounded-xl p-1 mb-6 border border-[#e0e3e5] w-full sm:w-fit">
        {([
          { key: 'generated', label: 'Generated Documents', shortLabel: 'Generated', icon: 'receipt_long' },
          { key: 'library',   label: 'Document Library',    shortLabel: 'My Files',  icon: 'folder_open' },
        ] as const).map(({ key, label, shortLabel, icon }) => (
          <button
            key={key}
            onClick={() => setMainTab(key)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mainTab === key
                ? 'bg-white text-[#191c1e] shadow-sm'
                : 'text-[#74777f] hover:text-[#191c1e]'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: mainTab === key ? `'FILL' 1` : `'FILL' 0` }}>{icon}</span>
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{shortLabel}</span>
          </button>
        ))}
      </div>

      {/* Generated Documents tab */}
      {mainTab === 'generated' && (
        <>
          {/* Status filter — scrollable on mobile */}
          <div className="flex gap-1 bg-[#f7f9fb] rounded-lg p-1 mb-5 border border-[#e0e3e5] overflow-x-auto">
            {(['all', 'draft', 'processing', 'ready', 'downloaded'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                  statusFilter === s ? 'bg-white text-[#191c1e] shadow-sm' : 'text-[#74777f] hover:text-[#191c1e]'
                }`}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {isLoading ? (
            <SkeletonCard />
          ) : isError ? (
            <ErrorBanner message="Failed to load your export documents. Please refresh and try again." />
          ) : (
            <div className="space-y-3">
              {filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-[#e0e3e5] p-10 sm:p-12 text-center">
                  <p className="text-sm text-[#74777f] mb-4">No documents found.</p>
                  <button
                    onClick={() => navigate('/dashboard/export-documents/generate')}
                    className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
                    style={{ background: '#002046' }}
                  >
                    Generate First Document
                  </button>
                </div>
              ) : (
                filtered.map((doc) => {
                  const dtc = docTypeConfig[doc.type];
                  const dsc = docStatusConfig[doc.status];
                  const isBusy = downloading && downloadingId === doc.id;
                  return (
                    <div key={doc.id} className="bg-white rounded-xl border border-[#e0e3e5] p-4 sm:p-5">
                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Doc type icon */}
                        <div
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: dtc.bg }}
                        >
                          <span className="material-symbols-outlined"
                            style={{ fontSize: 18, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20`, color: dtc.text }}>
                            {dtc.icon}
                          </span>
                        </div>

                        {/* Doc info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <p className="font-bold text-[#191c1e] text-sm">{dtc.label}</p>
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                                  style={{ background: dsc.bg, color: dsc.text }}>
                                  {dsc.label}
                                </span>
                              </div>
                              <p className="text-xs font-mono text-[#74777f] mb-0.5">{doc.referenceNo}</p>
                              <p className="text-xs text-[#74777f] truncate">
                                To: {doc.consignee} · {doc.destinationCountry}
                              </p>
                              <p className="text-xs text-[#74777f] mt-0.5 truncate">{doc.products}</p>
                            </div>
                            {/* Date — hidden on smallest screens, shown inline on sm+ */}
                            <p className="text-xs text-[#74777f] hidden sm:block flex-shrink-0">
                              {new Date(doc.createdAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>

                          {/* Action buttons — full width row on mobile */}
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            {/* Date on mobile */}
                            <span className="text-xs text-[#74777f] sm:hidden mr-auto">
                              {new Date(doc.createdAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>

                            {/* Edit */}
                            {(doc.type === 'commercial_invoice' || doc.type === 'packing_list') && doc.draftId && doc.status !== 'processing' && (
                              <button
                                onClick={() => navigate(`/dashboard/export-documents/generate/${doc.draftId}`)}
                                className="flex items-center gap-1 rounded-lg border border-[#c4c6cf] px-2.5 py-1.5 text-xs font-semibold text-[#191c1e] hover:border-[#002046] hover:text-[#002046] transition-colors"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>edit</span>
                                Edit
                              </button>
                            )}

                            {/* View + Download */}
                            {(doc.status === 'ready' || doc.status === 'downloaded') && (
                              <>
                                <button
                                  disabled={isBusy}
                                  onClick={() => handleView(doc)}
                                  className="flex items-center gap-1 rounded-lg border border-[#c4c6cf] px-2.5 py-1.5 text-xs font-semibold text-[#191c1e] hover:border-[#002046] hover:text-[#002046] transition-colors disabled:opacity-50"
                                >
                                  {isBusy ? '…' : (
                                    <>
                                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>visibility</span>
                                      View
                                    </>
                                  )}
                                </button>
                                <button
                                  disabled={isBusy}
                                  onClick={() => handleDownload(doc)}
                                  className="flex items-center gap-1 rounded-lg border border-[#c4c6cf] px-2.5 py-1.5 text-xs font-semibold text-[#74777f] hover:border-[#002046] hover:text-[#002046] transition-colors disabled:opacity-50"
                                >
                                  {isBusy ? '…' : (
                                    <>
                                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>download</span>
                                      Download
                                    </>
                                  )}
                                </button>
                              </>
                            )}

                            {/* Delete */}
                            {doc.status !== 'processing' && (
                              confirmDeleteId === doc.id ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-[#74777f]">Delete?</span>
                                  <button
                                    disabled={deletingId === doc.id}
                                    onClick={() => handleDelete(doc.id)}
                                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                                    style={{ background: '#93000a' }}
                                  >
                                    {deletingId === doc.id ? '…' : 'Yes'}
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="rounded-lg border border-[#c4c6cf] px-2.5 py-1.5 text-xs font-semibold text-[#191c1e]"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(doc.id)}
                                  className="flex items-center gap-1 rounded-lg border border-[#c4c6cf] px-2 py-1.5 text-xs font-semibold text-[#74777f] hover:border-red-300 hover:text-red-600 transition-colors"
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>delete</span>
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* Document Library tab */}
      {mainTab === 'library' && <DocumentLibraryView />}
    </div>
  );
}

// ── Admin View ─────────────────────────────────────────────────────────────

function AdminExportDocsView() {
  const { data: docs, isLoading, isError } = useGetAllExportDocsQuery();
  const [advanceToProcessing] = useAdvanceToProcessingMutation();
  const [statusFilter, setStatusFilter] = useState<'all' | ExportDocument['status']>('all');
  const [search, setSearch] = useState('');
  const [markReadyDocId, setMarkReadyDocId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const allDocs = docs ?? [];
  const filtered = allDocs.filter((d) => {
    const matchStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchSearch =
      !search ||
      d.referenceNo.toLowerCase().includes(search.toLowerCase()) ||
      (d.memberName ?? '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleProcess = async (doc: ExportDocument) => {
    setProcessingId(doc.id);
    try {
      await advanceToProcessing({ id: doc.id }).unwrap();
    } catch {
      // error is surfaced by RTK Query
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl">
      {markReadyDocId && (
        <MarkReadyModal
          docId={markReadyDocId}
          onClose={() => setMarkReadyDocId(null)}
        />
      )}

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#191c1e]">Export Documents — Admin</h2>
        <p className="text-sm text-[#74777f] mt-0.5">
          Review and process member export document requests.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {(
          [
            { icon: 'description', label: 'Total Documents', value: allDocs.length, accent: true },
            { icon: 'task_alt', label: 'Ready', value: allDocs.filter((d) => d.status === 'ready').length, accent: false },
            { icon: 'pending', label: 'Processing', value: allDocs.filter((d) => d.status === 'processing').length, accent: false },
            { icon: 'edit_note', label: 'Drafts', value: allDocs.filter((d) => d.status === 'draft').length, accent: false },
          ] as { icon: string; label: string; value: number; accent: boolean }[]
        ).map(({ icon, label, value, accent }) => (
          <div
            key={label}
            className={`rounded-xl border p-4 ${accent ? '' : 'bg-white border-[#e0e3e5]'}`}
            style={accent ? { background: '#002046', borderColor: '#002046' } : {}}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 18,
                  fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 18`,
                  color: accent ? '#aec7f7' : '#74777f',
                }}
              >
                {icon}
              </span>
              <p
                className={`text-xs font-semibold uppercase tracking-wide ${
                  accent ? 'text-[#aec7f7]' : 'text-[#74777f]'
                }`}
              >
                {label}
              </p>
            </div>
            <p className={`text-2xl font-bold ${accent ? 'text-white' : 'text-[#191c1e]'}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="search"
          placeholder="Search by ref or member…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-[#c4c6cf] px-4 py-2 text-sm focus:outline-none focus:border-[#002046] w-64"
        />
        <div className="flex gap-1 bg-[#f7f9fb] rounded-lg p-1 border border-[#e0e3e5]">
          {(['all', 'draft', 'processing', 'ready', 'downloaded'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                statusFilter === s ? 'bg-white shadow-sm text-[#191c1e]' : 'text-[#74777f]'
              }`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <SkeletonCard />
      ) : isError ? (
        <ErrorBanner message="Failed to load export documents. Please refresh and try again." />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e0e3e5] p-12 text-center">
          <p className="text-sm text-[#74777f]">No documents match the current filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#e0e3e5] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f7f9fb] border-b border-[#e0e3e5]">
                  {['Document', 'Member', 'Consignee', 'Destination', 'Status', 'Created', 'Actions'].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-[#74777f] uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f4]">
                {filtered.map((doc) => {
                  const dtc = docTypeConfig[doc.type];
                  const dsc = docStatusConfig[doc.status];
                  const isBusy = processingId === doc.id;
                  return (
                    <tr key={doc.id} className="hover:bg-[#f7f9fb] transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#191c1e]">{dtc.label}</p>
                        <p className="text-xs font-mono text-[#74777f]">{doc.referenceNo}</p>
                      </td>
                      <td className="px-4 py-3 text-[#74777f]">{doc.memberName ?? '—'}</td>
                      <td className="px-4 py-3 text-[#74777f] max-w-[140px] truncate">
                        {doc.consignee}
                      </td>
                      <td className="px-4 py-3 text-[#74777f]">{doc.destinationCountry}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                          style={{ background: dsc.bg, color: dsc.text }}
                        >
                          {dsc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#74777f]">
                        {new Date(doc.createdAt).toLocaleDateString('en-NG', {
                          timeZone: 'Africa/Lagos',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        {doc.status === 'draft' && (
                          <button
                            disabled={isBusy}
                            onClick={() => handleProcess(doc)}
                            className="text-xs font-medium px-2.5 py-1 rounded-md text-white disabled:opacity-50"
                            style={{ background: '#c5a059' }}
                          >
                            {isBusy ? '…' : 'Process'}
                          </button>
                        )}
                        {doc.status === 'processing' && (
                          <button
                            onClick={() => setMarkReadyDocId(doc.id)}
                            className="text-xs font-medium px-2.5 py-1 rounded-md text-white"
                            style={{ background: '#0b6c4b' }}
                          >
                            Mark Ready
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Router entry ───────────────────────────────────────────────────────────

export function ExportDocumentsPage() {
  const role = useAppSelector((s) => s.auth.role);
  const isAdmin = role && ADMIN_ROLES.includes(role);
  return isAdmin ? <AdminExportDocsView /> : <MemberExportDocsView />;
}
