'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[deepchox] global render error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#FDFCF8' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div style={{ maxWidth: 400, textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#2C1B18', marginBottom: '0.75rem' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#2C1B18', opacity: 0.6, marginBottom: '1.5rem' }}>
              A critical error occurred. Please refresh the page.
            </p>
            {error.digest && (
              <p style={{ fontSize: '0.75rem', color: '#2C1B18', opacity: 0.3, marginBottom: '1rem', fontFamily: 'monospace' }}>
                ref: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '0.75rem',
                background: '#2C1B18',
                color: '#FDFCF8',
                fontSize: '0.875rem',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
