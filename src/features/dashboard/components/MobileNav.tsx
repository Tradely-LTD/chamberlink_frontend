import { useState } from 'react';
import { Sidebar } from './Sidebar';

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="md:hidden flex items-center justify-between px-4 h-14 bg-surface border-b border-border">
        <div className="flex items-center gap-2.5">
          <img src="/naccima-seal.png" alt="" className="h-8 w-8 object-contain" />
          <p className="text-ink font-semibold text-[15px]">Chamberlink</p>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="h-11 w-11 -mr-2 flex items-center justify-center rounded-control text-ink-muted hover:bg-surface-alt transition-colors"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 22, fontVariationSettings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24` }}
          >
            {open ? 'close' : 'menu'}
          </span>
        </button>
      </header>
      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar />
          </div>
        </div>
      )}
    </>
  );
}
