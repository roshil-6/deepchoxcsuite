'use client';

/**
 * DexoAvatar — clean monogram mark.
 * Dark circle with "D" letterform + a small state-colour dot.
 * Scales to any size; replaces the old particle cluster.
 */

import React from 'react';

export type AvatarState = 'idle' | 'thinking' | 'speaking' | 'listening';
export type AvatarSize  = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_PX: Record<AvatarSize, number> = {
    xs: 20,
    sm: 28,
    md: 38,
    lg: 56,
    xl: 72,
};

const FONT_SIZE: Record<AvatarSize, number> = {
    xs: 9,
    sm: 12,
    md: 15,
    lg: 22,
    xl: 28,
};

const DOT_SIZE: Record<AvatarSize, number> = {
    xs: 4,
    sm: 5,
    md: 6,
    lg: 8,
    xl: 10,
};

const STATE_DOT: Record<AvatarState, string> = {
    idle:      'rgba(255,255,255,0.25)',
    thinking:  'rgba(245,158,11,0.85)',   // amber
    speaking:  'rgba(16,185,129,0.85)',    // emerald
    listening: 'rgba(244,63,94,0.85)',     // rose
};

export function DexoAvatar({
    state    = 'idle',
    size     = 'md',
    className = '',
    pulse    = true,
}: {
    state?:     AvatarState;
    size?:      AvatarSize;
    className?: string;
    pulse?:     boolean;
}) {
    const px      = SIZE_PX[size];
    const fs      = FONT_SIZE[size];
    const dotPx   = DOT_SIZE[size];
    const dotColor = STATE_DOT[state];

    return (
        <div
            className={`relative shrink-0 flex items-center justify-center rounded-full select-none ${className}`}
            style={{
                width:      px,
                height:     px,
                background: 'rgba(255,255,255,0.06)',
                border:     '1px solid rgba(255,255,255,0.12)',
            }}
        >
            {/* Monogram */}
            <span
                style={{
                    fontSize:   fs,
                    fontWeight: 600,
                    color:      '#f2f2f5',
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    fontFamily: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)',
                }}
            >
                D
            </span>

            {/* State dot — bottom-right */}
            <span
                className={state !== 'idle' && pulse ? 'animate-pulse' : ''}
                style={{
                    position:     'absolute',
                    bottom:       dotPx > 5 ? 1 : 0,
                    right:        dotPx > 5 ? 1 : 0,
                    width:        dotPx,
                    height:       dotPx,
                    borderRadius: '50%',
                    background:   dotColor,
                    border:       '1px solid rgba(13,13,16,0.8)',
                }}
            />
        </div>
    );
}
