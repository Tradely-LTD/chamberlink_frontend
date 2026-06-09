import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-[#fdf8f3] flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#00502e]">403</h1>
        <h2 className="mt-2 text-xl font-semibold text-[#221a0f]">
          Access Denied
        </h2>
        <p className="mt-2 text-sm text-[#8A7E6E]">
          You don&apos;t have permission to view this page.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block text-sm text-[#00502e] hover:underline"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
