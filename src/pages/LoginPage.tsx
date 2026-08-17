import { LoginForm } from '@features/auth/components/LoginForm';
import { AuthShell } from '@features/auth/components/AuthShell';

export function LoginPage() {
  return (
    <AuthShell
      kicker="Welcome back"
      heading={<>Return to your<br /><em className="font-display italic font-semibold text-primary">export desk.</em></>}
      lede="Access your Chamberlink application workspace, compliance records and certificate status."
      benefits={[
        'Continue your Certificate of Origin applications',
        'Track review and certificate status',
        'Keep your export documents organised',
      ]}
      cardIcon="verified_user"
      cardTitle="Sign in to Chamberlink"
      cardLede="Sign in to apply for a Certificate of Origin, access chamber services, or connect an existing chamber membership ID."
      dividerLabel="New to Chamberlink?"
      secondaryLinkTo="/register"
      secondaryLinkLabel="Create a platform account"
    >
      <LoginForm />
    </AuthShell>
  );
}
