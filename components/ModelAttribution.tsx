'use client';

/** Small grey line under assistant responses — model name from API */
export function ModelAttribution({ model }: { model?: string | null }) {
    if (!model) return null;
    return (
        <p style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
            Powered by {model}
        </p>
    );
}
