import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@shared/hooks/useAppDispatch';
import { setCredentials } from '../authSlice';
import { useVerifyMfaMutation } from '../authApi';
import { tokenStorage } from '@shared/utils/tokenStorage';
import { fetchUserWithToken } from '@shared/utils/fetchUserWithToken';
import { OtpInput } from '@shared/ui/OtpInput';
import { Button } from '@shared/ui/Button';
import { ErrorBanner } from '@shared/ui/ErrorBanner';

export function MfaVerifyForm() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const userId = useAppSelector((s) => s.auth.pendingMfaUserId);
  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [verifyMfa, { isLoading }] = useVerifyMfaMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || code.length < 6) return;
    setLocalError(null);
    try {
      const result = await verifyMfa({ userId, code }).unwrap();
      tokenStorage.set(result.refreshToken);
      const user = await fetchUserWithToken(result.accessToken);
      dispatch(setCredentials({ accessToken: result.accessToken, user }));
      navigate('/dashboard');
    } catch {
      setLocalError('Invalid or expired code. Please try again.');
      setCode('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <p className="text-sm text-[#8A7E6E]">
        Enter the 6-digit authentication code sent to your registered contact.
      </p>
      {localError && <ErrorBanner message={localError} />}
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
        Verify Code
      </Button>
    </form>
  );
}
