import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGetMemberProfileQuery } from '@features/dashboard/dashboardApi';
import { usePatchProfileMutation, useUploadLogoMutation } from '@features/dashboard/profileApi';
import { isNoActiveChamberError } from '@shared/utils';
import { SectionCard, DetailGrid } from '@shared/ui/SectionCard';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Input';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { SkeletonCard } from '@shared/ui/SkeletonCard';

const msg = (err: unknown, fallback: string) => (err as { data?: { message?: string } })?.data?.message ?? fallback;

/**
 * The business behind the account: trading name, CAC number, sector, address,
 * website and the logo printed on generated invoices and packing lists.
 * Lives on My Company (not My Profile) so "you" and "your business" are
 * edited in one place each. Stored on the member's chamber profile, so it
 * needs a chamber connection.
 */
export function BusinessProfileCard() {
  const { data: profile, isLoading, error, refetch } = useGetMemberProfileQuery();
  const [patchProfile, { isLoading: saving }] = usePatchProfileMutation();
  const [uploadLogo, { isLoading: uploading }] = useUploadLogoMutation();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ businessName: '', registrationNumber: '', industry: '', address: '', city: '', state: '', website: '' });
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (isLoading) return <SkeletonCard className="h-64" />;
  if (isNoActiveChamberError(error)) {
    return (
      <SectionCard title="Business details" description="Trading name, CAC number, sector, address and your document logo.">
        <p className="text-[13px] text-ink-muted">
          Business details are kept with your chamber membership. <Link to="/dashboard/connections" className="font-medium text-primary hover:underline underline-offset-2">Connect a chamber</Link> to add them.
        </p>
      </SectionCard>
    );
  }
  if (error) return <ErrorBanner message="Couldn't load your business details." onRetry={refetch} />;

  const start = () => {
    setForm({
      businessName: profile?.businessName ?? '', registrationNumber: profile?.registrationNumber ?? '', industry: profile?.industry ?? '',
      address: profile?.address ?? '', city: profile?.city ?? '', state: profile?.state ?? '', website: profile?.website ?? '',
    });
    setErr(null); setEditing(true);
  };
  const save = async () => {
    setErr(null);
    const updates: Record<string, string> = {};
    Object.entries(form).forEach(([k, v]) => { if (v.trim()) updates[k] = v.trim(); });
    try { await patchProfile(updates).unwrap(); setEditing(false); refetch(); }
    catch (e) { setErr(msg(e, 'Could not save your business details.')); }
  };
  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) { setErr('Use a JPEG or PNG image.'); return; }
    const fd = new FormData(); fd.append('logo', file);
    try { await uploadLogo(fd).unwrap(); refetch(); } catch (e2) { setErr(msg(e2, 'Logo upload failed.')); }
  };
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <SectionCard
      title="Business details"
      description="Used on your export documents and your chamber listing."
      action={!editing && <Button size="sm" variant="secondary" onClick={start}>Edit</Button>}
      footer={editing && <>
        <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
        <Button loading={saving} onClick={save}>Save changes</Button>
      </>}
    >
      {err && <div className="mb-4"><ErrorBanner message={err} /></div>}

      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-card border border-border bg-surface-alt">
          {profile?.logoUrl
            ? <img src={profile.logoUrl} alt="Company logo" className="h-full w-full object-contain" />
            : <span className="material-symbols-outlined text-ink-subtle" aria-hidden="true" style={{ fontSize: 26 }}>storefront</span>}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">Document logo</p>
          <p className="text-xs text-ink-subtle">Printed on generated invoices and packing lists. JPEG or PNG.</p>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onLogo} />
          <Button size="sm" variant="secondary" className="mt-2" loading={uploading} onClick={() => fileRef.current?.click()}>
            {profile?.logoUrl ? 'Replace logo' : 'Upload logo'}
          </Button>
        </div>
      </div>

      {editing ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Trading name" value={form.businessName} onChange={set('businessName')} />
          <Input label="CAC registration number" placeholder="e.g. RC-123456" value={form.registrationNumber} onChange={set('registrationNumber')} />
          <Input label="Sector" placeholder="e.g. Solid minerals, Agriculture" value={form.industry} onChange={set('industry')} />
          <Input label="Website" placeholder="https://yourcompany.com" value={form.website} onChange={set('website')} />
          <div className="sm:col-span-2"><Input label="Street address" value={form.address} onChange={set('address')} /></div>
          <Input label="City" value={form.city} onChange={set('city')} />
          <Input label="State" value={form.state} onChange={set('state')} />
        </div>
      ) : (
        <DetailGrid items={[
          { label: 'Trading name', value: profile?.businessName },
          { label: 'CAC registration number', value: profile?.registrationNumber },
          { label: 'Sector', value: profile?.industry },
          { label: 'Website', value: profile?.website },
          { label: 'Address', value: [profile?.address, profile?.city, profile?.state].filter(Boolean).join(', '), wide: true },
        ]} />
      )}
    </SectionCard>
  );
}
