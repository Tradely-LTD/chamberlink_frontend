import { useState } from 'react';
import { useCheckRosterMutation, useConnectViaRosterMutation } from '../connectionsApi';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Input';
import type { RosterPreview } from '../connectionsApi';

interface Props {
  tenantId: string;
  tenantName: string;
  onClose: () => void;
  /** Called with a human-readable success message once a connection is made. */
  onConnected: (message: string) => void;
}

function formatMemberSince(iso: string | null): string | null {
  if (!iso) return null;
  const year = new Date(iso).getFullYear();
  return Number.isNaN(year) ? null : String(year);
}

/**
 * "Connect using an existing/legacy member ID" flow — distinct from
 * ConnectChamberModal (which auto-generates a brand-new member ID). This is
 * for members whose chamber has uploaded a legacy roster and who already
 * hold a real member ID from before ChamberLink existed.
 *
 * Two steps:
 *  1. Type the legacy ID -> checkRoster (read-only preview, "is this you?").
 *  2. Confirm -> connectViaRoster (the actual claim). The preview does NOT
 *     guarantee the claim succeeds (another user may claim the row first),
 *     so every distinct backend response on the claim step is handled here.
 */
export function ConnectViaRosterModal({ tenantId, tenantName, onClose, onConnected }: Props) {
  const [legacyMemberId, setLegacyMemberId] = useState('');
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [preview, setPreview] = useState<RosterPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [checkRoster, { isLoading: isChecking }] = useCheckRosterMutation();
  const [connectViaRoster, { isLoading: isConnecting }] = useConnectViaRosterMutation();

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = legacyMemberId.trim();
    if (!trimmed) return;
    setError(null);
    try {
      const result = await checkRoster({ tenantId, legacyMemberId: trimmed }).unwrap();
      if (result.matched && result.preview) {
        setPreview(result.preview);
        setStep('preview');
      } else {
        setError('No match found — double-check the ID or contact the chamber.');
      }
    } catch {
      setError('Something went wrong while checking that ID. Please try again.');
    }
  };

  const handleTryDifferentId = () => {
    setStep('input');
    setPreview(null);
    setError(null);
  };

  const handleConfirm = async () => {
    setError(null);
    try {
      await connectViaRoster({ tenantId, legacyMemberId: legacyMemberId.trim() }).unwrap();
      onConnected('Connected using your existing membership ID.');
      onClose();
    } catch (err: unknown) {
      const e = err as { status?: number; data?: { message?: string } };
      const message = e.data?.message;
      if (e.status === 404) {
        setError(message ?? 'No matching membership record found for that ID.');
      } else if (e.status === 409) {
        setError(message ?? 'This membership record could not be claimed. Please contact the chamber.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    }
  };

  const memberSinceYear = preview ? formatMemberSince(preview.memberSince) : null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#e0e3e5] px-5 py-4">
          <h2 className="text-base font-semibold text-[#191c1e]">Connect with existing ID — {tenantName}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#74777f] hover:bg-[#eceef0] transition-colors"
            aria-label="Close"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 20, fontVariationSettings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20` }}
            >
              close
            </span>
          </button>
        </div>

        <div className="px-5 py-4">
          {step === 'input' && (
            <form onSubmit={handleCheck} className="space-y-4">
              <p className="text-sm text-[#8A7E6E]">
                If you were already a member of {tenantName} before joining ChamberLink, enter your existing
                member ID to link your records.
              </p>
              <Input
                label="Existing Member ID"
                value={legacyMemberId}
                onChange={(e) => setLegacyMemberId(e.target.value)}
                placeholder="e.g. LCC-2019-0042"
                autoFocus
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" loading={isChecking} disabled={!legacyMemberId.trim()}>
                  Check ID
                </Button>
              </div>
            </form>
          )}

          {step === 'preview' && preview && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-[#191c1e]">Is this you?</p>
              <div className="rounded-lg border border-[#e0e3e5] bg-[#f7f9f7] px-4 py-3 text-sm text-[#221a0f] space-y-1">
                <p>{preview.firstNameMasked}</p>
                {preview.businessName && <p>{preview.businessName}</p>}
                <p className="text-[#8A7E6E]">
                  {[preview.tierName, memberSinceYear ? `member since ${memberSinceYear}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleTryDifferentId} disabled={isConnecting}>
                  Try a different ID
                </Button>
                <Button type="button" loading={isConnecting} onClick={handleConfirm}>
                  Confirm — this is me
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
