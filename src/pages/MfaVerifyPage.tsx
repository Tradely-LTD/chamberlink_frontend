import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import { MfaVerifyForm } from '@features/auth/components/MfaVerifyForm';
import { AuthShell } from '@features/auth/components/AuthShell';

export function MfaVerifyPage() {
  const navigate = useNavigate();
  const userId = useAppSelector((s) => s.auth.pendingMfaUserId);

  useEffect(() => {
    if (!userId) navigate('/login', { replace: true });
  }, [userId, navigate]);

  if (!userId) return null;

  return (
    <AuthShell
      kicker="One more step"
      heading={<>Confirm it&apos;s<br /><em className="font-display italic font-semibold text-primary">really you.</em></>}
      lede="Two-factor authentication keeps your chamber account, certificate history, and payments secure."
      benefits={[
        'Protects certificate approvals and payments',
        'Required for Admin and Institutional accounts',
        'Codes expire quickly for your safety',
      ]}
      cardIcon="password"
      cardTitle="Enter verification code"
      cardLede="Enter the 6-digit authentication code sent to your registered contact to finish signing in."
      dividerLabel="Wrong account?"
      secondaryLinkTo="/login"
      secondaryLinkLabel="Back to Login"
    >
      <MfaVerifyForm />
    </AuthShell>
  );
}
