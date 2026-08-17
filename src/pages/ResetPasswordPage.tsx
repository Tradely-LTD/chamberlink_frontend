import { Navigate, useSearchParams } from 'react-router-dom';
import { ResetPasswordForm } from '@features/auth/components/ResetPasswordForm';
import { AuthShell } from '@features/auth/components/AuthShell';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const userId = searchParams.get('userId');

  if (!token || !userId)
    return <Navigate to="/auth/forgot-password" replace />;

  return (
    <AuthShell
      kicker="Password reset"
      heading={<>Choose a new<br /><em className="font-display italic font-semibold text-primary">password.</em></>}
      lede="Set a new password to finish recovering access to your Chamberlink account."
      benefits={[
        'Use at least 8 characters',
        'Avoid reusing an old password',
        'You’ll stay signed in on this device',
      ]}
      cardIcon="key"
      cardTitle="Reset your password"
      cardLede="Choose a new password for your account."
      dividerLabel="Changed your mind?"
      secondaryLinkTo="/login"
      secondaryLinkLabel="Back to Login"
    >
      <ResetPasswordForm userId={userId} token={token} />
    </AuthShell>
  );
}
