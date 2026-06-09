import { useEffect } from 'react';

interface Props {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const colors = {
  success: 'bg-green-100 border-green-500 text-green-800',
  error: 'bg-red-100 border-red-500 text-red-800',
  info: 'bg-blue-100 border-blue-500 text-blue-800',
};

export function Toast({ message, type, onClose }: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-start gap-3 rounded-lg border-l-4 p-4 shadow-md max-w-sm ${colors[type]}`}
    >
      <p className="text-sm">{message}</p>
      <button
        onClick={onClose}
        className="ml-auto text-current opacity-60 hover:opacity-100"
      >
        &#x2715;
      </button>
    </div>
  );
}
