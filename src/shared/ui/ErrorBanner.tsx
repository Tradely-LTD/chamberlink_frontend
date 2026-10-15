interface Props {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: Props) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-control border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger">
      <span className="material-symbols-outlined mt-px" aria-hidden="true" style={{ fontSize: 18 }}>error</span>
      <p className="flex-1">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="font-medium underline-offset-2 hover:underline">Try again</button>
      )}
    </div>
  );
}
