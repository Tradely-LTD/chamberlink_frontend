import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-surface-warm flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary">403</h1>
        <h2 className="mt-2 text-xl font-semibold text-ink">
          Access Denied
        </h2>
        <p className="mt-2 text-sm text-ink-subtle">
          You don&apos;t have permission to view this page.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block text-sm text-primary hover:underline"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
