import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import { VerifyEmailForm } from '@features/auth/components/VerifyEmailForm';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const userId = useAppSelector((s) => s.auth.pendingVerifyUserId);

  useEffect(() => {
    if (!userId) navigate('/register', { replace: true });
  }, [userId, navigate]);

  if (!userId) return null;

  return (
    <div className="min-h-screen bg-[#fdf8f3] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-bold text-[#00502e]">
            KACCIMA
          </h1>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-[#bec9bf]/40">
          <h2 className="mb-2 text-xl font-semibold text-[#221a0f]">
            Verify your email
          </h2>
          <VerifyEmailForm />
        </div>
      </div>
    </div>
  );
}
