import { RegisterForm } from '@features/auth/components/RegisterForm';
import { AuthHeader } from '@shared/ui/AuthHeader';

export function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#fdf8f3] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <AuthHeader subtitle="Create your account" />
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-[#bec9bf]/40">
          <h2 className="mb-6 text-xl font-semibold text-[#221a0f]">
            Register as a Member
          </h2>
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
