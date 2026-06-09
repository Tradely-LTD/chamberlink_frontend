import { RegisterForm } from '@features/auth/components/RegisterForm';

export function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#fdf8f3] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-bold text-[#00502e]">
            KACCIMA
          </h1>
          <p className="mt-1 text-sm text-[#8A7E6E]">Create your account</p>
        </div>
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
