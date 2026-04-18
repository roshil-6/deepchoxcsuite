'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[deepchox] render error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFCF8] px-4">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="text-4xl font-light text-[#2C1B18]/30">!</div>
        <h1 className="text-xl font-semibold text-[#2C1B18]">Something went wrong</h1>
        <p className="text-sm text-[#2C1B18]/60">
          An unexpected error occurred. This has been noted — try again or refresh.
        </p>
        {error.digest && (
          <p className="text-xs text-[#2C1B18]/30 font-mono">ref: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#2C1B18] text-[#FDFCF8] text-sm font-medium hover:bg-[#2C1B18]/80 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
