import { RegisterForm } from '@features/auth/components/RegisterForm';
import { AuthShell } from '@features/auth/components/AuthShell';

export function RegisterPage() {
  return (
    <AuthShell
      kicker="Join Chamberlink"
      heading={<>Start your<br /><em className="font-display italic font-semibold text-primary">export journey.</em></>}
      lede="Create your Chamberlink ID to apply for a Certificate of Origin, connect with a chamber, or manage your export documentation."
      benefits={[
        'One ChamberLink ID works across every chamber you connect with',
        'Apply for a Certificate of Origin — with or without a chamber',
        'Connect an existing membership ID from your chamber',
      ]}
      cardIcon="domain_add"
      cardTitle="Create your account"
      cardLede="Register once, then connect to any onboarded chamber — or apply as a guest exporter without a membership."
      dividerLabel="Already have an account?"
      secondaryLinkTo="/login"
      secondaryLinkLabel="Sign in instead"
    >
      <RegisterForm />
    </AuthShell>
  );
}
