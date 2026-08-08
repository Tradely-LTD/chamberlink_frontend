import { useState } from 'react';
import { Button } from '@shared/ui/Button';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import {
  useGetCoursesQuery,
  useGetMyEnrollmentsQuery,
  useGetAllEnrollmentsQuery,
  useEnrollCourseMutation,
  useLazyGetMaterialQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useGetCourseSectionsQuery,
  useAddSectionMutation,
  useUpdateSectionMutation,
  useDeleteSectionMutation,
  useUploadCourseMaterialMutation,
} from '@features/academy/academyApi';
import type { Course, Enrollment, CourseSection } from '@features/academy/academyApi';

// ── Constants ─────────────────────────────────────────────────────────────

const ADMIN_ROLES = ['chamber_admin', 'chamber_executive', 'super_admin', 'staff_operator'];

const levelColor: Record<Course['level'], { bg: string; text: string }> = {
  beginner:     { bg: '#a0f4ca', text: '#005137' },
  intermediate: { bg: '#ffdea5', text: '#5d4201' },
  advanced:     { bg: '#ffdad6', text: '#93000a' },
};

// ── Video embed helper ────────────────────────────────────────────────────

function toEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

// ── Add/Edit Course Modal (admin) ─────────────────────────────────────────

function CourseFormModal({
  course,
  onClose,
  onCreated,
  onManageSections,
}: {
  course?: Course;
  onClose: () => void;
  onCreated?: (newCourse: Course) => void;
  onManageSections?: () => void;
}) {
  const [createCourse, { isLoading: creating }] = useCreateCourseMutation();
  const [updateCourse, { isLoading: updating }] = useUpdateCourseMutation();
  const isLoading = creating || updating;
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: course?.title ?? '',
    description: course?.description ?? '',
    category: course?.category ?? '',
    duration: course?.duration ?? '',
    level: course?.level ?? ('beginner' as Course['level']),
    price: course?.price?.toString() ?? '0',
    isFree: course?.isFree ?? true,
    instructorName: course?.instructorName ?? '',
    isPublished: course?.isPublished ?? false,
    videoUrl: course?.videoUrl ?? '',
  });

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload: Partial<Course> = {
        ...form,
        price: Number(form.price),
        level: form.level as Course['level'],
        videoUrl: form.videoUrl.trim() || undefined,
      };
      if (course) {
        await updateCourse({ id: course.id, ...payload }).unwrap();
        onClose();
      } else {
        const newCourse = await createCourse(payload).unwrap();
        if (onCreated) {
          onCreated(newCourse);
        } else {
          onClose();
        }
      }
    } catch {
      setError(`Failed to ${course ? 'update' : 'create'} course. Please try again.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#e0e3e5] px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-bold text-[#191c1e]">{course ? 'Edit Course' : 'Add New Course'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f7f9fb] text-[#74777f]">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <ErrorBanner message={error} />}

          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">Course Title</label>
            <input required value={form.title} onChange={set('title')} placeholder="e.g. Export Documentation Fundamentals" className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#002046]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">Description</label>
            <textarea required rows={3} value={form.description} onChange={set('description')} className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#002046] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">Category</label>
              <input required value={form.category} onChange={set('category')} placeholder="e.g. Export" className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">Duration</label>
              <input required value={form.duration} onChange={set('duration')} placeholder="e.g. 4 hours" className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">Level</label>
              <select value={form.level} onChange={set('level')} className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">Instructor</label>
              <input value={form.instructorName} onChange={set('instructorName')} placeholder="e.g. NACCIMA Trade Desk" className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">Price (&#x20A6;)</label>
              <input type="number" min="0" value={form.price} onChange={set('price')} className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div className="flex flex-col gap-2 pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isFree} onChange={(e) => setForm((f) => ({ ...f, isFree: e.target.checked }))} className="w-4 h-4 accent-[#002046]" />
                <span className="text-sm text-[#191c1e]">Free course</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))} className="w-4 h-4 accent-[#002046]" />
                <span className="text-sm text-[#191c1e]">Published</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">
              Intro Video URL (YouTube/Vimeo) <span className="font-normal text-[#74777f]">— optional, shown before enrollment</span>
            </label>
            <input
              value={form.videoUrl}
              onChange={set('videoUrl')}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#002046]"
            />
          </div>

          {/* When editing: shortcut to section manager */}
          {course && onManageSections && (
            <button
              type="button"
              onClick={onManageSections}
              className="w-full flex items-center justify-between rounded-xl border border-dashed border-[#002046]/30 bg-[#f0f4ff] px-4 py-3 text-sm text-[#002046] hover:bg-[#e8eeff] transition-colors"
            >
              <span className="flex items-center gap-2 font-semibold">
                <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: `'FILL' 1` }}>video_library</span>
                Add / manage course content (sections &amp; videos)
              </span>
              <span className="material-symbols-outlined text-[#002046]/60" style={{ fontSize: 18 }}>arrow_forward</span>
            </button>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <button type="submit" disabled={isLoading} className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#002046' }}>
              {isLoading ? 'Saving...' : (course ? 'Save Changes' : 'Create Course')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Section Manager Modal (admin) ─────────────────────────────────────────

function SectionManagerModal({ course, onClose }: { course: Course; onClose: () => void }) {
  const { data: sections = [], isLoading } = useGetCourseSectionsQuery(course.id);
  const [addSection, { isLoading: adding }] = useAddSectionMutation();
  const [updateSection, { isLoading: updatingId }] = useUpdateSectionMutation();
  const [deleteSection] = useDeleteSectionMutation();
  const [uploadMaterial, { isLoading: uploading }] = useUploadCourseMaterialMutation();

  // Track the current PDF URL locally so it refreshes after upload without a full refetch
  const [pdfUrl, setPdfUrl] = useState<string | null | undefined>(course.materialPdfUrl);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { setPdfError('Only PDF files are supported.'); return; }
    if (file.size > 10 * 1024 * 1024) { setPdfError('File must be under 10 MB.'); return; }
    setPdfError(null);
    try {
      const updated = await uploadMaterial({ courseId: course.id, file }).unwrap();
      setPdfUrl(updated.materialPdfUrl);
    } catch {
      setPdfError('Upload failed. Please try again.');
    }
    // Reset the input so the same file can be re-selected if needed
    e.target.value = '';
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blank = { title: '', description: '', videoUrl: '', sortOrder: '' };
  const [addForm, setAddForm] = useState(blank);
  const [editForm, setEditForm] = useState<typeof blank>(blank);

  const setAdd = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setAddForm((f) => ({ ...f, [k]: e.target.value }));
  const setEdit = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setEditForm((f) => ({ ...f, [k]: e.target.value }));

  const startEdit = (s: CourseSection) => {
    setEditingId(s.id);
    setEditForm({ title: s.title, description: s.description ?? '', videoUrl: s.videoUrl, sortOrder: String(s.sortOrder) });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await addSection({
        courseId: course.id,
        title: addForm.title.trim(),
        description: addForm.description.trim() || undefined,
        videoUrl: addForm.videoUrl.trim(),
        sortOrder: addForm.sortOrder ? Number(addForm.sortOrder) : sections.length,
      }).unwrap();
      setAddForm(blank);
      setShowAddForm(false);
    } catch {
      setError('Failed to add section. Please try again.');
    }
  };

  const handleUpdate = async (sectionId: string) => {
    setError(null);
    try {
      await updateSection({
        sectionId,
        courseId: course.id,
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
        videoUrl: editForm.videoUrl.trim(),
        sortOrder: editForm.sortOrder ? Number(editForm.sortOrder) : undefined,
      }).unwrap();
      setEditingId(null);
    } catch {
      setError('Failed to update section. Please try again.');
    }
  };

  const handleDelete = async (sectionId: string) => {
    if (!window.confirm('Delete this section? This cannot be undone.')) return;
    try {
      await deleteSection({ sectionId, courseId: course.id }).unwrap();
    } catch {
      setError('Failed to delete section.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-[#e0e3e5] px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="font-bold text-[#191c1e]">Course Content</h2>
            <p className="text-xs text-[#74777f] mt-0.5 max-w-md truncate">{course.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowAddForm(true); setEditingId(null); }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
              style={{ background: '#002046' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
              Add Section
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f7f9fb] text-[#74777f]">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* ── PDF Course Materials ─────────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold text-[#44474e] uppercase tracking-wide mb-2">Course Materials (PDF)</p>
            <div className="rounded-xl border border-[#e0e3e5] bg-[#f7f9fb] p-4">
              {pdfUrl ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#ffdad6' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: `'FILL' 1`, color: '#93000a' }}>picture_as_pdf</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#191c1e]">Course material uploaded</p>
                    <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#002046] underline">Preview PDF</a>
                  </div>
                  <label className="cursor-pointer rounded-lg border border-[#c4c6cf] px-3 py-1.5 text-xs font-semibold text-[#44474e] hover:border-[#002046] hover:text-[#002046] transition-colors flex-shrink-0">
                    {uploading ? 'Uploading…' : 'Replace'}
                    <input type="file" accept="application/pdf" className="sr-only" onChange={handlePdfChange} disabled={uploading} />
                  </label>
                </div>
              ) : (
                <label className={`flex flex-col items-center justify-center gap-2 py-6 cursor-pointer rounded-lg border-2 border-dashed transition-colors ${uploading ? 'border-[#002046]/40 bg-[#f0f4ff]' : 'border-[#c4c6cf] hover:border-[#002046]'}`}>
                  {uploading ? (
                    <>
                      <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#002046] border-t-transparent" />
                      <span className="text-xs text-[#002046] font-medium">Uploading…</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[#74777f]" style={{ fontSize: 28, fontVariationSettings: `'FILL' 1` }}>upload_file</span>
                      <span className="text-sm font-semibold text-[#44474e]">Click to upload a PDF</span>
                      <span className="text-xs text-[#74777f]">Handouts, study guides, references — max 10 MB</span>
                    </>
                  )}
                  <input type="file" accept="application/pdf" className="sr-only" onChange={handlePdfChange} disabled={uploading} />
                </label>
              )}
              {pdfError && <p className="mt-2 text-xs text-[#93000a]">{pdfError}</p>}
            </div>
          </div>

          {/* ── Video Sections ───────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold text-[#44474e] uppercase tracking-wide mb-2">Video Sections</p>
          </div>

          {error && <div className="mb-2"><ErrorBanner message={error} /></div>}

          {isLoading && <SkeletonCard />}

          {!isLoading && sections.length === 0 && !showAddForm && (
            <div className="rounded-xl border-2 border-dashed border-[#c4c6cf] p-10 text-center">
              <span className="material-symbols-outlined text-[#74777f] mb-2 block" style={{ fontSize: 32, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 32` }}>video_library</span>
              <p className="text-sm font-semibold text-[#44474e] mb-1">No sections yet</p>
              <p className="text-xs text-[#74777f] mb-4">Add YouTube or Vimeo video links as course sections.</p>
              <button onClick={() => setShowAddForm(true)} className="rounded-lg px-4 py-2 text-xs font-semibold text-white" style={{ background: '#002046' }}>
                Add First Section
              </button>
            </div>
          )}

          {sections.map((s, idx) => (
            <div key={s.id} className="bg-white rounded-xl border border-[#e0e3e5] overflow-hidden">
              {editingId === s.id ? (
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-[#44474e] mb-1">Section Title</label>
                      <input required value={editForm.title} onChange={setEdit('title')} className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#002046]" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-[#44474e] mb-1">Video URL (YouTube/Vimeo)</label>
                      <input required value={editForm.videoUrl} onChange={setEdit('videoUrl')} placeholder="https://www.youtube.com/watch?v=..." className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#002046]" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-[#44474e] mb-1">Description <span className="font-normal text-[#74777f]">— optional</span></label>
                      <textarea rows={2} value={editForm.description} onChange={setEdit('description')} className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#002046] resize-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#44474e] mb-1">Order</label>
                      <input type="number" min="0" value={editForm.sortOrder} onChange={setEdit('sortOrder')} className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setEditingId(null)} className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-[#c4c6cf] text-[#44474e]">Cancel</button>
                    <button onClick={() => handleUpdate(s.id)} disabled={!!updatingId} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" style={{ background: '#002046' }}>
                      {updatingId ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: '#d6e3ff', color: '#002046' }}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#191c1e] truncate">{s.title}</p>
                    <p className="text-xs text-[#74777f] truncate">{s.videoUrl}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(s)} className="p-1.5 rounded-lg hover:bg-[#f7f9fb] text-[#74777f] hover:text-[#002046]">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-[#ffdad6] text-[#74777f] hover:text-[#93000a]">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add section form */}
          {showAddForm && (
            <div className="bg-[#f7f9fb] rounded-xl border border-[#002046]/20 p-4">
              <p className="text-xs font-bold text-[#002046] mb-3 uppercase tracking-wide">New Section</p>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#44474e] mb-1">Section Title</label>
                  <input required value={addForm.title} onChange={setAdd('title')} placeholder="e.g. Introduction to HS Codes" className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#002046]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44474e] mb-1">Video URL (YouTube/Vimeo)</label>
                  <input required value={addForm.videoUrl} onChange={setAdd('videoUrl')} placeholder="https://www.youtube.com/watch?v=..." className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#002046]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44474e] mb-1">Description <span className="font-normal text-[#74777f]">— optional</span></label>
                  <textarea rows={2} value={addForm.description} onChange={setAdd('description')} className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#002046] resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44474e] mb-1">Order <span className="font-normal text-[#74777f]">— leave blank to add at end</span></label>
                  <input type="number" min="0" value={addForm.sortOrder} onChange={setAdd('sortOrder')} placeholder={String(sections.length)} className="w-full max-w-[120px] rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => { setShowAddForm(false); setAddForm(blank); }} className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-[#c4c6cf] text-[#44474e]">Cancel</button>
                  <button type="submit" disabled={adding} className="rounded-lg px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50" style={{ background: '#002046' }}>
                    {adding ? 'Adding…' : 'Add Section'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Admin View ─────────────────────────────────────────────────────────────

function AdminAcademyView() {
  const { data: courses, isLoading: coursesLoading, error: coursesError } = useGetCoursesQuery();
  const { data: enrollments, isLoading: enrollmentsLoading, error: enrollmentsError } = useGetAllEnrollmentsQuery();
  const [tab, setTab] = useState<'courses' | 'enrollments'>('courses');
  const [showForm, setShowForm] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [managingSections, setManagingSections] = useState<Course | null>(null);
  const [search, setSearch] = useState('');

  const allCourses = courses ?? [];
  const allEnrollments = enrollments ?? [];

  const filteredCourses = search
    ? allCourses.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase()))
    : allCourses;

  const totalEnrollments = allEnrollments.length;
  const completedCount = allEnrollments.filter((e) => e.completedAt).length;
  const avgProgress = allEnrollments.length > 0
    ? Math.round(allEnrollments.reduce((s, e) => s + e.progress, 0) / allEnrollments.length)
    : 0;

  return (
    <div className="p-6 max-w-6xl">
      {(showForm || editCourse) && (
        <CourseFormModal
          course={editCourse ?? undefined}
          onClose={() => { setShowForm(false); setEditCourse(null); }}
          onCreated={(newCourse) => { setShowForm(false); setManagingSections(newCourse); }}
          onManageSections={editCourse ? () => { setEditCourse(null); setManagingSections(editCourse); } : undefined}
        />
      )}
      {managingSections && (
        <SectionManagerModal course={managingSections} onClose={() => setManagingSections(null)} />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#191c1e]">Academy Management</h2>
          <p className="text-sm text-[#74777f] mt-0.5">Manage courses, content, and track member progress.</p>
        </div>
        {tab === 'courses' && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: '#002046' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            Add Course
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { icon: 'school', label: 'Total Courses', value: allCourses.length, accent: true },
          { icon: 'group', label: 'Enrollments', value: totalEnrollments },
          { icon: 'verified', label: 'Completed', value: completedCount },
          { icon: 'trending_up', label: 'Avg Progress', value: `${avgProgress}%` },
        ].map(({ icon, label, value, accent }) => (
          <div key={label} className={`rounded-xl border p-4 ${accent ? '' : 'bg-white border-[#e0e3e5]'}`} style={accent ? { background: '#002046', borderColor: '#002046' } : {}}>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 18`, color: accent ? '#aec7f7' : '#74777f' }}>{icon}</span>
              <p className={`text-xs font-semibold uppercase tracking-wide ${accent ? 'text-[#aec7f7]' : 'text-[#74777f]'}`}>{label}</p>
            </div>
            <p className={`text-2xl font-bold ${accent ? 'text-white' : 'text-[#191c1e]'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#f7f9fb] rounded-lg p-1 mb-6 w-fit border border-[#e0e3e5]">
        {([['courses', 'Course Catalog'], ['enrollments', 'Member Enrollments']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === id ? 'bg-white text-[#191c1e] shadow-sm' : 'text-[#74777f] hover:text-[#191c1e]'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Course Catalog tab */}
      {tab === 'courses' && (
        <>
          <div className="mb-4">
            <input type="search" placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full max-w-sm rounded-lg border border-[#c4c6cf] px-4 py-2 text-sm focus:outline-none focus:border-[#002046]" />
          </div>
          {coursesError && <div className="mb-4"><ErrorBanner message="Failed to load courses. Please refresh." /></div>}
          {coursesLoading ? (
            <SkeletonCard />
          ) : filteredCourses.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#e0e3e5] p-12 text-center">
              <p className="text-sm text-[#74777f]">No courses available yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#e0e3e5] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f7f9fb] border-b border-[#e0e3e5]">
                    {['Course', 'Category', 'Level', 'Price', 'Enrolled', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#74777f] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f2f4]">
                  {filteredCourses.map((course) => {
                    const lc = levelColor[course.level];
                    return (
                      <tr key={course.id} className="hover:bg-[#f7f9fb] transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#191c1e] max-w-[220px]">{course.title}</p>
                          {course.instructorName && <p className="text-xs text-[#74777f]">{course.instructorName}</p>}
                        </td>
                        <td className="px-4 py-3 text-[#74777f]">{course.category}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize" style={{ background: lc.bg, color: lc.text }}>{course.level}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-[#191c1e]">{course.isFree ? 'Free' : `₦${course.price.toLocaleString()}`}</td>
                        <td className="px-4 py-3 text-[#191c1e]">{course.enrolledCount.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                            style={course.isPublished ? { background: '#a0f4ca', color: '#005137' } : { background: '#e0e3e5', color: '#44474e' }}
                          >
                            {course.isPublished ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditCourse(course)}
                              className="rounded-lg border border-[#c4c6cf] px-2.5 py-1 text-xs font-semibold text-[#44474e] hover:border-[#002046] hover:text-[#002046] transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setManagingSections(course)}
                              className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-white transition-colors"
                              style={{ background: '#002046' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: `'FILL' 1` }}>video_library</span>
                              Content
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Member Enrollments tab */}
      {tab === 'enrollments' && (
        <div className="bg-white rounded-xl border border-[#e0e3e5] overflow-hidden">
          {enrollmentsError && <div className="p-4"><ErrorBanner message="Failed to load enrollments. Please refresh." /></div>}
          {enrollmentsLoading ? (
            <div className="p-6"><SkeletonCard /></div>
          ) : allEnrollments.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-[#74777f]">No enrollments yet.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f7f9fb] border-b border-[#e0e3e5]">
                  {['Member', 'Course', 'Progress', 'Enrolled', 'Status'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#74777f] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f4]">
                {allEnrollments.map((e) => (
                  <tr key={e.id} className="hover:bg-[#f7f9fb] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#191c1e]">{e.memberName ?? '—'}</p>
                      <p className="text-xs text-[#74777f]">{e.memberEmail ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-[#191c1e] max-w-[200px]">{e.courseTitle}</td>
                    <td className="px-4 py-3 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[#e0e3e5] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${e.progress}%`, background: e.progress === 100 ? '#0b6c4b' : '#002046' }} />
                        </div>
                        <span className="text-xs font-semibold text-[#74777f] w-8 text-right">{e.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#74777f] text-xs">
                      {new Date(e.enrolledAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={e.completedAt ? { background: '#a0f4ca', color: '#005137' } : { background: '#ffdea5', color: '#5d4201' }}
                      >
                        {e.completedAt ? 'Completed' : 'In Progress'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ── Member View ────────────────────────────────────────────────────────────

function CoursePlayerModal({ enrollment, onClose }: { enrollment: Enrollment; onClose: () => void }) {
  const { data: sections = [], isLoading } = useGetCourseSectionsQuery(enrollment.courseId);
  const [activeIdx, setActiveIdx] = useState(0);

  const active = sections[activeIdx];
  const embedUrl = active ? toEmbedUrl(active.videoUrl) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-[#e0e3e5] px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-bold text-[#191c1e]">{enrollment.courseTitle}</h2>
            {active && <p className="text-xs text-[#74777f] mt-0.5">Section {activeIdx + 1} of {sections.length}: {active.title}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f7f9fb] text-[#74777f]">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-10">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#002046] border-t-transparent" />
          </div>
        ) : sections.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
            <span className="material-symbols-outlined text-[#74777f] mb-3" style={{ fontSize: 48, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 48` }}>video_library</span>
            <p className="text-base font-semibold text-[#191c1e] mb-1">No content yet</p>
            <p className="text-sm text-[#74777f]">The instructor hasn&apos;t added sections to this course yet. Check back soon.</p>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Section list sidebar */}
            <div className="w-64 flex-shrink-0 border-r border-[#e0e3e5] overflow-y-auto">
              <div className="p-3 space-y-1">
                {sections.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveIdx(i)}
                    className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${i === activeIdx ? 'text-white' : 'hover:bg-[#f7f9fb] text-[#191c1e]'}`}
                    style={i === activeIdx ? { background: '#002046' } : {}}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={i === activeIdx ? { background: 'rgba(255,255,255,0.2)', color: 'white' } : { background: '#d6e3ff', color: '#002046' }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-xs font-medium line-clamp-2 leading-tight">{s.title}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Video player */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {embedUrl ? (
                <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                  <iframe
                    key={embedUrl}
                    src={embedUrl}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={active?.title}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center" style={{ aspectRatio: '16/9' }}>
                  <span className="material-symbols-outlined text-[#74777f] mb-2" style={{ fontSize: 36 }}>link_off</span>
                  <p className="text-sm font-semibold text-[#44474e] mb-1">Unsupported video URL</p>
                  <a href={active?.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#002046] underline break-all">{active?.videoUrl}</a>
                </div>
              )}
              {active?.description && (
                <div className="px-5 py-4 border-t border-[#e0e3e5] overflow-y-auto">
                  <p className="text-xs font-semibold text-[#44474e] mb-1 uppercase tracking-wide">About this section</p>
                  <p className="text-sm text-[#74777f] whitespace-pre-wrap">{active.description}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer navigation */}
        {sections.length > 0 && (
          <div className="border-t border-[#e0e3e5] px-6 py-3 flex items-center justify-between flex-shrink-0">
            <button
              disabled={activeIdx === 0}
              onClick={() => setActiveIdx((i) => i - 1)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border border-[#c4c6cf] text-[#191c1e] disabled:opacity-40"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_back</span>
              Previous
            </button>
            <span className="text-xs text-[#74777f]">{activeIdx + 1} / {sections.length}</span>
            <button
              disabled={activeIdx === sections.length - 1}
              onClick={() => setActiveIdx((i) => i + 1)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border border-[#c4c6cf] text-[#191c1e] disabled:opacity-40"
            >
              Next
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Enrolled course card with material download ────────────────────────────

function EnrolledCourseCard({
  enrollment,
  onContinue,
}: {
  enrollment: Enrollment;
  onContinue: (e: Enrollment) => void;
}) {
  const [getMaterial, { isFetching: loadingMaterial }] = useLazyGetMaterialQuery();
  const [materialError, setMaterialError] = useState<string | null>(null);

  const handleDownloadMaterial = async () => {
    setMaterialError(null);
    try {
      const result = await getMaterial(enrollment.courseId).unwrap();
      window.open(result.presignedUrl, '_blank');
    } catch (err: unknown) {
      const anyErr = err as { status?: number };
      if (anyErr?.status === 404) {
        setMaterialError('No PDF materials available for this course.');
      } else {
        setMaterialError('Failed to retrieve materials. Please try again.');
      }
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#e0e3e5] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[#191c1e]">{enrollment.courseTitle}</h3>
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
          style={enrollment.completedAt ? { background: '#a0f4ca', color: '#005137' } : { background: '#ffdea5', color: '#5d4201' }}
        >
          {enrollment.completedAt ? 'Completed' : 'In Progress'}
        </span>
      </div>
      <div className="mb-3">
        <div className="flex justify-between text-xs text-[#74777f] mb-1"><span>Progress</span><span className="font-semibold">{enrollment.progress}%</span></div>
        <div className="h-2 bg-[#e0e3e5] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${enrollment.progress}%`, background: enrollment.progress === 100 ? '#0b6c4b' : '#002046' }} />
        </div>
      </div>
      {materialError && (
        <p className="text-xs text-[#93000a] mb-2">{materialError}</p>
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-[#74777f]">
          Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadMaterial}
            disabled={loadingMaterial}
            className="flex items-center gap-1.5 rounded-lg border border-[#c4c6cf] px-3 py-1.5 text-xs font-semibold text-[#191c1e] hover:border-[#002046] hover:text-[#002046] transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: `'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 14` }}>download</span>
            {loadingMaterial ? 'Loading...' : 'PDF Materials'}
          </button>
          {!enrollment.completedAt && (
            <button
              onClick={() => onContinue(enrollment)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors"
              style={{ background: '#002046' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: `'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 14` }}>play_arrow</span>
              Continue Learning
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Course Detail Modal (pre-enrolment preview) ───────────────────────────

function CourseDetailModal({
  course,
  isEnrolled,
  enrolling,
  onEnroll,
  onGoToCourse,
  onClose,
}: {
  course: Course;
  isEnrolled: boolean;
  enrolling: boolean;
  onEnroll: () => void;
  onGoToCourse: () => void;
  onClose: () => void;
}) {
  const lc = levelColor[course.level];
  const embedUrl = course.videoUrl ? toEmbedUrl(course.videoUrl) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#e0e3e5] px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="font-bold text-[#191c1e] pr-8 leading-snug">{course.title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f7f9fb] text-[#74777f] flex-shrink-0">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div className="p-6">
          {/* Meta chips */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize" style={{ background: lc.bg, color: lc.text }}>{course.level}</span>
            {course.category && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: '#d6e3ff', color: '#002046' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: `'FILL' 1` }}>category</span>
                {course.category}
              </span>
            )}
            {course.duration && (
              <span className="inline-flex items-center gap-1 text-xs text-[#74777f]">
                <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: `'FILL' 1` }}>schedule</span>
                {course.duration}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-[#74777f]">
              <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: `'FILL' 1` }}>group</span>
              {course.enrolledCount.toLocaleString()} enrolled
            </span>
            {course.instructorName && (
              <span className="inline-flex items-center gap-1 text-xs text-[#74777f]">
                <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: `'FILL' 1` }}>person</span>
                {course.instructorName}
              </span>
            )}
          </div>

          {/* Intro video */}
          {embedUrl ? (
            <div className="relative w-full rounded-xl overflow-hidden mb-5" style={{ paddingTop: '56.25%' }}>
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={`${course.title} — intro`}
              />
            </div>
          ) : (
            <div className="rounded-xl flex items-center justify-center mb-5" style={{ background: '#002046', height: 120 }}>
              <div className="text-center">
                <span className="material-symbols-outlined text-white/40" style={{ fontSize: 36, fontVariationSettings: `'FILL' 1` }}>school</span>
                <p className="text-xs text-[#aec7f7] mt-1 uppercase tracking-wide font-semibold">{course.category}</p>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-[#44474e] uppercase tracking-wide mb-2">About this course</p>
            <p className="text-sm text-[#44474e] leading-relaxed whitespace-pre-wrap">{course.description}</p>
          </div>

          {/* Price + CTA */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-[#e0e3e5]">
            <div>
              <p className="text-xs text-[#74777f] mb-0.5">Price</p>
              <p className="text-xl font-bold" style={{ color: course.isFree ? '#0b6c4b' : '#191c1e' }}>
                {course.isFree ? 'Free' : `₦${course.price.toLocaleString()}`}
              </p>
            </div>
            {isEnrolled ? (
              <button
                onClick={onGoToCourse}
                className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
                style={{ background: '#0b6c4b' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: `'FILL' 1` }}>play_circle</span>
                Go to My Course
              </button>
            ) : (
              <button
                onClick={onEnroll}
                disabled={enrolling}
                className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: '#002046' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: `'FILL' 1` }}>school</span>
                {enrolling ? 'Enrolling…' : 'Enroll Now'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberAcademyView() {
  const { data: courses, isLoading: coursesLoading, error: coursesError } = useGetCoursesQuery();
  const { data: enrollments, isLoading: enrollmentsLoading, error: enrollmentsError, refetch: refetchEnrollments } = useGetMyEnrollmentsQuery();
  const [enrollCourse, { isLoading: enrolling }] = useEnrollCourseMutation();
  const [tab, setTab] = useState<'catalog' | 'my-courses'>('catalog');
  const [search, setSearch] = useState('');
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [playingEnrollment, setPlayingEnrollment] = useState<Enrollment | null>(null);
  const [previewCourse, setPreviewCourse] = useState<Course | null>(null);

  const allCourses = (courses ?? []).filter((c) => c.isPublished !== false);
  const myEnrollments = enrollments ?? [];

  const filtered = allCourses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleEnroll = async (course: Course) => {
    setEnrollError(null);
    setEnrollingId(course.id);
    try {
      const result = await enrollCourse(course.id).unwrap();
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        refetchEnrollments();
        setTab('my-courses');
      }
    } catch {
      setEnrollError(`Failed to enroll in "${course.title}". Please try again.`);
    } finally {
      setEnrollingId(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl">
      {playingEnrollment && <CoursePlayerModal enrollment={playingEnrollment} onClose={() => setPlayingEnrollment(null)} />}
      {previewCourse && (
        <CourseDetailModal
          course={previewCourse}
          isEnrolled={myEnrollments.some((e) => e.courseId === previewCourse.id)}
          enrolling={enrolling && enrollingId === previewCourse.id}
          onEnroll={() => { handleEnroll(previewCourse); setPreviewCourse(null); }}
          onGoToCourse={() => { setPreviewCourse(null); setTab('my-courses'); }}
          onClose={() => setPreviewCourse(null)}
        />
      )}

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#191c1e]">NACCIMA Academy</h2>
        <p className="text-sm text-[#74777f] mt-0.5">Training and capacity building for chamber members.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#f7f9fb] rounded-lg p-1 mb-6 w-fit border border-[#e0e3e5]">
        {([['catalog', 'Course Catalog'], ['my-courses', 'My Learning']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-[#191c1e] shadow-sm' : 'text-[#74777f] hover:text-[#191c1e]'}`}>
            {label}
            {t === 'my-courses' && myEnrollments.length > 0 && (
              <span className="ml-1.5 rounded-full px-1.5 py-0.5 text-xs text-white font-bold" style={{ background: '#002046' }}>{myEnrollments.length}</span>
            )}
          </button>
        ))}
      </div>

      {enrollError && <div className="mb-4"><ErrorBanner message={enrollError} /></div>}

      {tab === 'catalog' && (
        <>
          <div className="mb-5">
            <input type="search" placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-md rounded-lg border border-[#c4c6cf] px-4 py-2.5 text-sm focus:outline-none focus:border-[#002046]" />
          </div>
          {coursesError && <div className="mb-4"><ErrorBanner message="Failed to load courses. Please refresh." /></div>}
          {coursesLoading ? (
            <SkeletonCard />
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#e0e3e5] p-12 text-center">
              <p className="text-sm text-[#74777f]">No courses available yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((course) => {
                const isEnrolled = myEnrollments.some((e) => e.courseId === course.id);
                const isBusy = enrolling && enrollingId === course.id;
                const lc = levelColor[course.level];
                return (
                  <div key={course.id} className="bg-white rounded-xl border border-[#e0e3e5] overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                    {/* Clickable banner → opens detail modal */}
                    <button
                      onClick={() => setPreviewCourse(course)}
                      className="h-24 w-full flex items-center justify-center px-4 relative group"
                      style={{ background: '#002046' }}
                    >
                      <div className="text-center">
                        <span className="material-symbols-outlined text-white/60" style={{ fontSize: 28, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 28` }}>school</span>
                        <p className="text-xs font-semibold text-[#aec7f7] uppercase tracking-wide mt-1">{course.category}</p>
                      </div>
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-t-xl" style={{ background: 'rgba(0,0,0,0.35)' }}>
                        <span className="text-xs font-semibold text-white flex items-center gap-1">
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>visibility</span>
                          View Details
                        </span>
                      </span>
                    </button>
                    <div className="p-4 flex flex-col flex-1">
                      <button onClick={() => setPreviewCourse(course)} className="text-left">
                        <h3 className="text-sm font-bold text-[#191c1e] line-clamp-2 mb-1 hover:text-[#002046] transition-colors">{course.title}</h3>
                      </button>
                      <p className="text-xs text-[#74777f] mb-3 line-clamp-2 flex-1">{course.description}</p>
                      {course.instructorName && <p className="text-xs text-[#74777f] mb-2">by {course.instructorName}</p>}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize" style={{ background: lc.bg, color: lc.text }}>{course.level}</span>
                        <span className="text-xs text-[#74777f]">{course.duration}</span>
                        <span className="text-xs text-[#74777f]">· {course.enrolledCount.toLocaleString()} enrolled</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold" style={{ color: course.isFree ? '#0b6c4b' : '#191c1e' }}>
                          {course.isFree ? 'Free' : `₦${course.price.toLocaleString()}`}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setPreviewCourse(course)}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold border border-[#c4c6cf] text-[#74777f] hover:border-[#002046] hover:text-[#002046] transition-colors"
                          >
                            Details
                          </button>
                          <button
                            disabled={isBusy}
                            onClick={() => isEnrolled ? setTab('my-courses') : handleEnroll(course)}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all disabled:opacity-50"
                            style={isEnrolled
                              ? { border: '1px solid #c4c6cf', color: '#191c1e', background: 'white' }
                              : { background: '#002046', color: 'white' }
                            }
                          >
                            {isBusy ? '…' : isEnrolled ? 'My Course' : 'Enroll'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'my-courses' && (
        <div className="space-y-4">
          {enrollmentsError && <ErrorBanner message="Failed to load your courses. Please refresh." />}
          {enrollmentsLoading ? (
            <SkeletonCard />
          ) : myEnrollments.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#e0e3e5] p-12 text-center">
              <p className="text-sm text-[#74777f] mb-4">You haven&apos;t enrolled in any courses yet.</p>
              <button onClick={() => setTab('catalog')} className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white" style={{ background: '#002046' }}>
                Browse Catalog
              </button>
            </div>
          ) : (
            myEnrollments.map((enrollment) => (
              <EnrolledCourseCard
                key={enrollment.id}
                enrollment={enrollment}
                onContinue={(e) => setPlayingEnrollment(e)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Router entry ───────────────────────────────────────────────────────────

export function AcademyPage() {
  const role = useAppSelector((s) => s.auth.role);
  const isAdmin = role && ADMIN_ROLES.includes(role);
  return isAdmin ? <AdminAcademyView /> : <MemberAcademyView />;
}
