import { useId } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface Props {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** Suppress the built-in <label> — use when composing with an external label element. */
  hideLabel?: boolean;
}

// Radix reserves the empty string internally (it means "no selection" / shows
// the placeholder) and throws if an Item uses it as a value — but this app's
// existing convention is an explicit "" option meaning "All" / "no filter",
// selectable just like any other option. Map "" <-> this sentinel at the
// boundary so callers never need to know Radix's restriction exists.
const EMPTY_SENTINEL = '__select_empty__';

export function Select({
  label, value, onValueChange, options, placeholder = 'Select…', error, disabled, className = '', id: idProp, hideLabel,
}: Props) {
  const generatedId = useId();
  const selectId = idProp ?? generatedId;

  // Only substitute the sentinel when "" is genuinely one of the listed
  // options (an intentional "All" / "None" choice) — otherwise leave value
  // untouched so Radix's own value==='' placeholder behavior keeps working.
  const hasEmptyOption = options.some((o) => o.value === '');
  const rootValue = value === '' && hasEmptyOption ? EMPTY_SENTINEL : value;

  return (
    <div className="flex flex-col gap-1">
      {!hideLabel && (
        <label htmlFor={selectId} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <SelectPrimitive.Root
        value={rootValue}
        onValueChange={(v) => onValueChange(v === EMPTY_SENTINEL ? '' : v)}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          id={selectId}
          aria-invalid={!!error}
          className={`w-full flex items-center justify-between gap-2 rounded-lg border bg-surface px-4 py-2.5 text-sm text-ink outline-none transition focus:ring-2 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed data-[placeholder]:text-ink-subtle ${
            error ? 'border-danger' : 'border-border'
          } ${className}`}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon>
            <span className="material-symbols-outlined text-ink-subtle flex-shrink-0" style={{ fontSize: 18 }}>
              expand_more
            </span>
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className="z-50 overflow-hidden rounded-lg border border-border bg-white shadow-card-hover w-[var(--radix-select-trigger-width)]"
          >
            <SelectPrimitive.ScrollUpButton className="flex items-center justify-center py-1 text-ink-subtle bg-white">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>expand_less</span>
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className="p-1 max-h-72">
              {options.map((opt) => {
                const itemValue = opt.value === '' ? EMPTY_SENTINEL : opt.value;
                return (
                  <SelectPrimitive.Item
                    key={itemValue}
                    value={itemValue}
                    disabled={opt.disabled}
                    className="relative flex items-center rounded-md px-3 py-2 pl-8 text-sm text-ink outline-none cursor-pointer select-none data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed"
                  >
                    <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center">
                      <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>check</span>
                    </SelectPrimitive.ItemIndicator>
                    <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                );
              })}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="flex items-center justify-center py-1 text-ink-subtle bg-white">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>expand_more</span>
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
