import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import { VerifyEmailForm } from '@features/auth/components/VerifyEmailForm';
import { AuthShell } from '@features/auth/components/AuthShell';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const userId = useAppSelector((s) => s.auth.pendingVerifyUserId);

  useEffect(() => {
    if (!userId) navigate('/register', { replace: true });
  }, [userId, navigate]);

  if (!userId) return null;

  return (
    <AuthShell
      kicker="Almost there"
      heading={<>Verify your<br /><em className="font-display italic font-semibold text-primary">email address.</em></>}
      lede="Confirm your email to activate your Chamberlink ID and start applying for certificates."
      benefits={[
        'Unlocks your Chamberlink dashboard',
        'Required before applying for a Certificate of Origin',
        'Takes less than a minute',
      ]}
      cardIcon="mark_email_read"
      cardTitle="Verify your email"
      cardLede="Enter the 6-digit code we sent to your email address."
      dividerLabel="Wrong email?"
      secondaryLinkTo="/register"
      secondaryLinkLabel="Start over"
    >
      <VerifyEmailForm />
    </AuthShell>
  );
}
