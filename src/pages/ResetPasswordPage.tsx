import { Navigate, useSearchParams } from 'react-router-dom';
import { ResetPasswordForm } from '@features/auth/components/ResetPasswordForm';
import { AuthHeader } from '@shared/ui/AuthHeader';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const userId = searchParams.get('userId');

  if (!token || !userId)
    return <Navigate to="/auth/forgot-password" replace />;

  return (
    <div className="min-h-screen bg-surface-warm flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AuthHeader subtitle="Password Reset" />
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-border/40">
          <h2 className="mb-6 text-xl font-semibold text-ink">
            Reset your password
          </h2>
          <ResetPasswordForm userId={userId} token={token} />
        </div>
      </div>
    </div>
  );
}
