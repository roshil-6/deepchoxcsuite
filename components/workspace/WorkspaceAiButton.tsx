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
      className={`group inline-flex items-center gap-2 rounded-full bg-white/[0.08] px-4 py-2 text-xs font-medium text-brand-text transition hover:bg-white/[0.12] ${className}`}
    >
      <Sparkles className="h-3.5 w-3.5 text-brand-muted transition group-hover:rotate-12" aria-hidden />
      {label}
    </button>
  );
}
