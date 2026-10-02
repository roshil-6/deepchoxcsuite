'use client';

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Pure Vector Logo for CLAPFETCH by Northrosc matching Reference Image 2
 * Absolutely seamless with zero raster rectangular artifacts.
 */
export function Logo({ size = 'md', className = '' }: LogoProps) {
  const iconSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';
  const textSize = size === 'sm' ? 'text-[17px]' : size === 'lg' ? 'text-[24px]' : 'text-[20px]';
  const subtextSize = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-[12px]' : 'text-[11px]';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Vector Ribbon C + Play Button Mark */}
      <div className={`relative shrink-0 ${iconSize} flex items-center justify-center`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-xs"
        >
          <defs>
            {/* Top arm gradient: violet to purple */}
            <linearGradient id="top-arm-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>

            {/* Main spine & bottom gradient: purple to magenta/pink */}
            <linearGradient id="spine-bottom-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6D28D9" />
              <stop offset="40%" stopColor="#8B5CF6" />
              <stop offset="75%" stopColor="#D946EF" />
              <stop offset="100%" stopColor="#F43F5E" />
            </linearGradient>

            {/* Soft inner shadow on fold */}
            <linearGradient id="fold-shadow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4C1D95" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#4C1D95" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Outer Isometric Ribbon C */}
          {/* Main Body */}
          <path
            d="M68 20 C74 20, 78 24, 78 30 C78 34, 75 37, 70 38 L48 44 C42 45, 36 50, 36 56 C36 62, 41 67, 47 67 L68 67 C73 67, 77 71, 77 76 C77 82, 72 86, 66 86 L38 86 C22 86, 12 73, 12 56 C12 39, 23 20, 42 20 Z"
            fill="url(#spine-bottom-grad)"
          />

          {/* Top Overlap Ribbon Fold */}
          <path
            d="M42 20 L68 20 C74 20, 78 24, 78 30 C78 35, 74 39, 68 39 L40 39 C32 39, 25 33, 27 26 C29 22, 35 20, 42 20 Z"
            fill="url(#top-arm-grad)"
          />

          {/* Fold depth accent */}
          <path
            d="M36 39 C36 45, 32 50, 27 50 C24 50, 20 46, 20 40 C20 34, 25 30, 31 30 C34 30, 36 34, 36 39 Z"
            fill="url(#fold-shadow)"
          />

          {/* Play Button Triangle */}
          <path
            d="M43 38 C43 35.5, 46 34, 48 35.5 L67 47.5 C69 48.8, 69 51.2, 67 52.5 L48 64.5 C46 66, 43 64.5, 43 62 Z"
            fill="#FFFFFF"
          />
        </svg>
      </div>

      {/* Typography: CLAPFETCH by Northrosc matching Ref Image 2 */}
      <div className="flex flex-col justify-center">
        <span
          className={`font-black tracking-[-0.04em] text-[#110E1B] leading-none ${textSize}`}
          style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
        >
          CLAPFETCH
        </span>
        <span className={`font-medium text-[#716B7B] tracking-normal leading-tight mt-0.5 ${subtextSize}`}>
          by Northrosc
        </span>
      </div>
    </div>
  );
}
