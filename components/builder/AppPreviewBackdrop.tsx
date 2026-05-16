'use client';

type Props = {
  isDark?: boolean;
  className?: string;
};

/** Plain preview canvas background — gradient only, no canvas or glyphs. */
export function AppPreviewBackdrop({ isDark = true, className = '' }: Props) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{
        background: isDark
          ? 'radial-gradient(ellipse 90% 75% at 50% 35%, rgba(45,212,191,0.07) 0%, #050508 58%, #040406 100%)'
          : 'radial-gradient(ellipse 90% 75% at 50% 30%, rgba(45,212,191,0.11) 0%, #f4f4f6 55%, #eef0f4 100%)',
      }}
    />
  );
}
