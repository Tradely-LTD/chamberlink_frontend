import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import { useVerifyEmailMutation } from '../authApi';
import { OtpInput } from '@shared/ui/OtpInput';
import { Button } from '@shared/ui/Button';
import { ErrorBanner } from '@shared/ui/ErrorBanner';

export function VerifyEmailForm() {
  const navigate = useNavigate();
  const userId = useAppSelector((s) => s.auth.pendingVerifyUserId);
  const [code, setCode] = useState('');
  const [success, setSuccess] = useState(false);
  const [verifyEmail, { isLoading, error }] = useVerifyEmailMutation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || code.length < 6) return;
    try {
      await verifyEmail({ userId, code }).unwrap();
      setSuccess(true);
      timerRef.current = setTimeout(() => navigate('/login'), 3000);
    } catch {
      // error handled via RTK Query error state
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="text-5xl text-primary">&#10003;</div>
        <h2 className="text-xl font-semibold text-primary">
          Email Verified!
        </h2>
        <p className="text-sm text-ink-subtle">
          Redirecting to login in 3 seconds&hellip;
        </p>
        <Button onClick={() => navigate('/login')}>Go to Login</Button>
      </div>
    );
  }

  const errMsg = (error as { data?: { message?: string } })?.data?.message;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {errMsg && <ErrorBanner message={errMsg} />}
      <OtpInput
        length={6}
        value={code}
        onChange={setCode}
        disabled={isLoading}
      />
      <Button
        type="submit"
        loading={isLoading}
        disabled={code.length < 6}
        className="w-full"
      >
        Verify Email
      </Button>
    </form>
  );
}
