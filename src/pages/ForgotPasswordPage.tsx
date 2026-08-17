import { ForgotPasswordForm } from '@features/auth/components/ForgotPasswordForm';
import { AuthShell } from '@features/auth/components/AuthShell';

export function ForgotPasswordPage() {
  return (
    <AuthShell
      kicker="Password recovery"
      heading={<>Let&apos;s get you<br /><em className="font-display italic font-semibold text-primary">back in.</em></>}
      lede="Enter the email on your Chamberlink account and we'll send you a reset link."
      benefits={[
        'Works for every chamber you’re connected to',
        'Reset links expire for your security',
        'No account lockouts — just request a new link',
      ]}
      cardIcon="lock_reset"
      cardTitle="Forgot your password?"
      cardLede="Enter your email address and we'll send you a reset code."
      dividerLabel="Remembered it?"
      secondaryLinkTo="/login"
      secondaryLinkLabel="Back to Login"
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
