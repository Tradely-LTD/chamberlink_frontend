import { useRef } from 'react';

interface Props {
  length: number;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export function OtpInput({ length, value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, length);
    onChange(raw);
  };

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={length}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder={'0'.repeat(length)}
        className="w-full rounded-lg border border-border px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] outline-none transition focus:ring-2 focus:ring-primary/40"
      />
    </div>
  );
}
