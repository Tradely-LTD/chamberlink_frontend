import { Navigate, useSearchParams } from 'react-router-dom';
import { ResetPasswordForm } from '@features/auth/components/ResetPasswordForm';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const userId = searchParams.get('userId');

  if (!token || !userId)
    return <Navigate to="/auth/forgot-password" replace />;

  return (
    <div className="min-h-screen bg-[#fdf8f3] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-bold text-[#00502e]">
            KACCIMA
          </h1>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-[#bec9bf]/40">
          <h2 className="mb-6 text-xl font-semibold text-[#221a0f]">
            Reset your password
          </h2>
          <ResetPasswordForm userId={userId} token={token} />
        </div>
      </div>
    </div>
  );
}
