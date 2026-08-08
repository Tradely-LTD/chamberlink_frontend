import { useState } from 'react';
import { Sidebar } from './Sidebar';

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="md:hidden flex items-center justify-between px-4 h-14 bg-[#002046] border-b border-white/10">
        <p className="text-white font-bold text-base tracking-tight">NACCIMA</p>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-lg text-white/70 hover:bg-white/10 transition-colors"
          aria-label="Toggle menu"
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
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar />
          </div>
        </div>
      )}
    </>
  );
}
