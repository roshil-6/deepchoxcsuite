'use client';

import React from 'react';
import Image from 'next/image';

export type AvatarState = 'idle' | 'thinking' | 'speaking' | 'listening';
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<AvatarSize, { px: number; cls: string }> = {
    xs:  { px: 24,  cls: 'h-6 w-6'   },
    sm:  { px: 32,  cls: 'h-8 w-8'   },
    md:  { px: 48,  cls: 'h-12 w-12' },
    lg:  { px: 80,  cls: 'h-20 w-20' },
    xl:  { px: 112, cls: 'h-28 w-28' },
};

const STATE_RING: Record<AvatarState, string> = {
    idle:      'ring-[rgba(116,86,255,0.35)]  shadow-[0_0_18px_rgba(116,86,255,0.18)]',
    thinking:  'ring-[rgba(245,158,11,0.45)]  shadow-[0_0_18px_rgba(245,158,11,0.2)]',
    speaking:  'ring-[rgba(16,185,129,0.5)]   shadow-[0_0_22px_rgba(16,185,129,0.25)]',
    listening: 'ring-[rgba(244,63,94,0.5)]    shadow-[0_0_22px_rgba(244,63,94,0.25)]',
};

const STATE_GLOW: Record<AvatarState, string> = {
    idle:      'bg-[rgba(116,86,255,0.12)]',
    thinking:  'bg-[rgba(245,158,11,0.1)]',
    speaking:  'bg-[rgba(16,185,129,0.12)]',
    listening: 'bg-[rgba(244,63,94,0.1)]',
};

interface DexoAvatarProps {
    state?: AvatarState;
    size?: AvatarSize;
    className?: string;
    /** Pulse animation for active states */
    pulse?: boolean;
}

/**
 * Dexo's human-feel illustrated avatar.
 * Drop in anywhere — it reacts to the current AI state with a colored ring and ambient glow.
 *
 * Requires public/dexo-avatar.jpg
 *
 * xs / sm  → tight circle (chat bubbles, header dots)
 * md / lg / xl → rounded-2xl card so the full illustration is visible naturally.
 *
 * mix-blend-mode: multiply makes the white JPG background disappear on the dark UI.
 */
export function DexoAvatar({
    state = 'idle',
    size = 'md',
    className = '',
    pulse = true,
}: DexoAvatarProps) {
    const { px, cls } = SIZES[size];
    const ring = STATE_RING[state];
    const glow = STATE_GLOW[state];
    const shouldPulse = pulse && (state === 'listening' || state === 'thinking');

    // Small sizes clip to a circle (for chat bubble slots).
    // Larger sizes use a soft rounded-2xl card to show the full illustration.
    const isSmall = size === 'xs' || size === 'sm';
    const frameRadius = isSmall ? 'rounded-full' : 'rounded-2xl';

    return (
        <div className={`relative shrink-0 ${cls} ${className}`}>
            {/* Soft ambient halo behind the image */}
            <div
                className={`pointer-events-none absolute -inset-2 rounded-full blur-xl opacity-70 transition-colors duration-500 ${glow} ${shouldPulse ? 'animate-pulse' : ''}`}
                aria-hidden
            />
            {/* Avatar frame */}
            <div
                className={`relative overflow-hidden ring-2 transition-all duration-500 ${frameRadius} ${ring}`}
                style={{ width: px, height: px }}
            >
                <Image
                    src="/dexo-avatar.jpg"
                    alt="Dexo — your AI co-founder"
                    width={px}
                    height={px}
                    className="h-full w-full object-cover object-top [mix-blend-mode:multiply]"
                    priority
                />
            </div>
            {/* State dot — bottom-right corner */}
            {state !== 'idle' && (
                <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#030304] ${
                        state === 'thinking'  ? 'bg-amber-400 animate-pulse' :
                        state === 'speaking'  ? 'bg-emerald-400' :
                        /* listening */         'bg-rose-500 animate-pulse'
                    }`}
                    aria-hidden
                />
            )}
        </div>
    );
}
