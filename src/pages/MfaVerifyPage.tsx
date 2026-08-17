import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import { MfaVerifyForm } from '@features/auth/components/MfaVerifyForm';
import { AuthHeader } from '@shared/ui/AuthHeader';

export function MfaVerifyPage() {
  const navigate = useNavigate();
  const userId = useAppSelector((s) => s.auth.pendingMfaUserId);

  useEffect(() => {
    if (!userId) navigate('/login', { replace: true });
  }, [userId, navigate]);

  if (!userId) return null;

  return (
    <div className="min-h-screen bg-surface-warm flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AuthHeader subtitle="Two-Factor Authentication" />
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-border/40">
          <h2 className="mb-2 text-xl font-semibold text-ink">
            Enter verification code
          </h2>
          <MfaVerifyForm />
        </div>
      </div>
    </div>
  );
}
