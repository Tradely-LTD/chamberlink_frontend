import { ForgotPasswordForm } from '@features/auth/components/ForgotPasswordForm';
import { AuthHeader } from '@shared/ui/AuthHeader';

export function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-[#fdf8f3] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AuthHeader subtitle="Password Recovery" />
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-[#bec9bf]/40">
          <h2 className="mb-6 text-xl font-semibold text-[#221a0f]">
            Forgot your password?
          </h2>
          <ForgotPasswordForm />
        </div>
      </div>
    </div>
  );
}
