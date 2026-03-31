'use client';

import { useOffice } from '@/lib/OfficeContext';
import { Sparkles } from 'lucide-react';

type Props = {
  className?: string;
  label?: string;
};

/** Opens Dexo Core — full AI command surface (immersive). */
export function WorkspaceAiButton({ className = '', label = 'Open Dexo' }: Props) {
  const { switchRoom } = useOffice();
  return (
    <button
      type="button"
      onClick={() => switchRoom('dexo')}
      className={`group inline-flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700 ${className}`}
    >
      <Sparkles className="h-3.5 w-3.5 text-zinc-400 transition group-hover:rotate-12" aria-hidden />
      {label}
    </button>
  );
}
