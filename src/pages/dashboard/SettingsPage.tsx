import { useState } from 'react';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import { useGetSettingsQuery, useUpdateSettingMutation } from '@features/settings';
import type { PlatformSetting } from '@features/settings';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { Button } from '@shared/ui/Button';
import { Toast } from '@shared/ui/Toast';

/**
 * Every value here is stored and edited as a human-typed string — for a
 * "percent" setting, that string IS the percentage (e.g. "0.0011" means
 * 0.0011%), not a fraction. Matches settingsService.ts's convention exactly,
 * chosen specifically to avoid the fraction-vs-percentage confusion that
 * prompted building this settings feature: whatever you type here is
 * exactly the percentage used everywhere else in the app.
 */
function SettingRow({ setting, onSaved }: { setting: PlatformSetting; onSaved: (message: string) => void }) {
  const [updateSetting, { isLoading }] = useUpdateSettingMutation();
  const [value, setValue] = useState(setting.value);
  const [error, setError] = useState<string | null>(null);
  const dirty = value !== setting.value;

  const handleSave = async () => {
    setError(null);
    try {
      await updateSetting({ key: setting.key, value }).unwrap();
      onSaved(`${setting.label} updated.`);
    } catch (err: unknown) {
      setError((err as { data?: { message?: string } })?.data?.message ?? 'Failed to save. Please try again.');
    }
  };

  return (
    <div className="px-6 py-5 border-b border-border/30 last:border-0">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">{setting.label}</p>
          <p className="text-xs text-ink-subtle mt-0.5 max-w-xl">{setting.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <label className="sr-only" htmlFor={`setting-${setting.key}`}>{setting.label} value</label>
            <input
              id={`setting-${setting.key}`}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={`w-32 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink text-right outline-none transition focus:ring-2 focus:ring-primary/40 ${setting.type === 'percent' ? 'pr-7' : ''}`}
            />
            {setting.type === 'percent' && (
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-ink-subtle">%</span>
            )}
          </div>
          <Button variant="outline" loading={isLoading} disabled={!dirty} onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <p className="mt-1.5 text-[11px] text-ink-subtle">Default: {setting.defaultValue}{setting.type === 'percent' ? '%' : ''}</p>
    </div>
  );
}

function SettingsView() {
  const { data: settings, isLoading, isError, refetch } = useGetSettingsQuery();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink mb-1">Platform Settings</h1>
        <p className="text-sm text-ink-subtle">
          Operational values changeable without a code deploy. Adding a new setting later never needs a
          migration — this list is backed by a generic key/value store.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <SkeletonCard className="h-20" />
          <SkeletonCard className="h-20" />
        </div>
      )}

      {isError && !isLoading && (
        <div className="space-y-3">
          <ErrorBanner message="Failed to load settings." />
          <Button variant="outline" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="bg-white rounded-xl border border-border/40 overflow-hidden">
          {(settings ?? []).map((setting) => (
            <SettingRow key={setting.key} setting={setting} onSaved={(message) => setToast({ message, type: 'success' })} />
          ))}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export function SettingsPage() {
  const role = useAppSelector((s) => s.auth.role);
  if (role !== 'super_admin') {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#ffdad6' }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 32, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 32`, color: '#93000a' }}
            >
              lock
            </span>
          </div>
          <h2 className="font-bold text-ink mb-2">Access Restricted</h2>
          <p className="text-sm text-ink-subtle">This console is available to Super Admins only.</p>
        </div>
      </div>
    );
  }
  return <SettingsView />;
}
