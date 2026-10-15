/** Shared control styling for Input, Textarea and the Select trigger. */
export const controlClass = (error?: string) =>
  `w-full rounded-control border bg-surface text-sm text-ink placeholder:text-ink-subtle/80 transition-[border-color,box-shadow] duration-150 outline-none hover:border-ink-subtle focus:border-primary focus:shadow-focus disabled:bg-surface-alt disabled:text-ink-subtle disabled:cursor-not-allowed ${
    error ? 'border-danger focus:border-danger focus:shadow-[0_0_0_3px_rgb(var(--c-danger)/0.15)]' : 'border-border-input'
  }`;
