'use client';

/**
 * DexoAvatar — now renders the particle mark at any size.
 * No photo, no glass, no glows. Pure animated dot cluster.
 */

import React, { useEffect } from 'react';

export type AvatarState = 'idle' | 'thinking' | 'speaking' | 'listening';
export type AvatarSize  = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_PX: Record<AvatarSize, number> = {
    xs: 18,
    sm: 26,
    md: 38,
    lg: 56,
    xl: 72,
};

const STATE_RGB: Record<AvatarState, string> = {
    idle:      '148,163,184',   // slate
    thinking:  '245,158,11',    // amber
    speaking:  '16,185,129',    // emerald
    listening: '244,63,94',     // rose
};

// Five floating dots — positions as % of container
const DOTS = [
    { anim: 'dav-a', dur: '2.0s', delay: '0s',    x: '30%', y: '33%', scale: 0.26 },
    { anim: 'dav-b', dur: '2.7s', delay: '0.45s', x: '58%', y: '50%', scale: 0.20 },
    { anim: 'dav-c', dur: '2.3s', delay: '0.8s',  x: '44%', y: '63%', scale: 0.16 },
    { anim: 'dav-d', dur: '2.9s', delay: '0.25s', x: '55%', y: '26%', scale: 0.16 },
    { anim: 'dav-e', dur: '1.8s', delay: '1.05s', x: '24%', y: '55%', scale: 0.16 },
];

const CSS = `
@keyframes dav-a{0%,100%{transform:translate(0,0) scale(1);opacity:.45}50%{transform:translate(5px,-5px) scale(1.3);opacity:1}}
@keyframes dav-b{0%,100%{transform:translate(0,0) scale(1);opacity:.45}50%{transform:translate(-5px,4px) scale(1.3);opacity:1}}
@keyframes dav-c{0%,100%{transform:translate(0,0) scale(1);opacity:.4} 50%{transform:translate(4px,5px)  scale(1.2);opacity:.95}}
@keyframes dav-d{0%,100%{transform:translate(0,0) scale(1);opacity:.35}50%{transform:translate(-4px,-5px) scale(1.15);opacity:.85}}
@keyframes dav-e{0%,100%{transform:translate(0,0) scale(1);opacity:.3} 50%{transform:translate(3px,3px)  scale(1.1);opacity:.7}}
`;

let injected = false;
function injectCss() {
    if (injected || typeof document === 'undefined') return;
    const el = document.createElement('style');
    el.textContent = CSS;
    document.head.appendChild(el);
    injected = true;
}

export function DexoAvatar({
    state    = 'idle',
    size     = 'md',
    className = '',
    pulse    = true,         // kept for API compat — ignored (animation is always on)
}: {
    state?:     AvatarState;
    size?:      AvatarSize;
    className?: string;
    pulse?:     boolean;
}) {
    useEffect(() => { injectCss(); }, []);

    const px  = SIZE_PX[size];
    const rgb = STATE_RGB[state];

    return (
        <div
            className={`relative shrink-0 overflow-hidden rounded-full ${className}`}
            style={{
                width:      px,
                height:     px,
                background: `rgba(${rgb},0.08)`,
                border:     `1px solid rgba(${rgb},0.22)`,
            }}
        >
            {DOTS.map((d, i) => (
                <span
                    key={i}
                    className="absolute rounded-full"
                    style={{
                        width:     px * d.scale,
                        height:    px * d.scale,
                        left:      d.x,
                        top:       d.y,
                        background:`rgba(${rgb},0.9)`,
                        animation: `${d.anim} ${d.dur} ${d.delay} ease-in-out infinite`,
                    }}
                />
            ))}
        </div>
    );
}
