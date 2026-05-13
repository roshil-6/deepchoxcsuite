'use client';

import React from 'react';
import type { HeroComponent, CTA, UITheme } from '@/lib/uiSchema';
import { sanitizeMediaUrl } from '@/lib/builderSafety';
import { ArrowRight, Sparkles } from 'lucide-react';

interface HeroSectionProps {
  component: HeroComponent;
  theme: UITheme;
}

export function HeroSection({ component, theme }: HeroSectionProps) {
  const { title, subtitle, description, cta, secondaryCta, image, video, layout, badge } = component;
  const heroImage = sanitizeMediaUrl(image || '');
  const heroVideo = sanitizeMediaUrl(video || '');

  const isSplit = layout === 'split';
  const isFull = layout === 'full';

  const containerClasses = `relative w-full overflow-hidden ${isFull ? 'min-h-screen' : 'py-20 lg:py-32'}`;

  const contentClasses = isSplit
    ? 'flex flex-col lg:flex-row items-center gap-12 lg:gap-16'
    : 'flex flex-col items-center text-center';

  const textClasses = isSplit ? 'flex-1 max-w-xl lg:max-w-none' : 'max-w-4xl mx-auto';

  return (
    <section
      className={containerClasses}
      style={{ background: theme.background }}
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={contentClasses}>
          <div className={textClasses}>
            {badge && (
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6"
                style={{
                  background: `${theme.primaryColor}20`,
                  color: theme.primaryColor,
                }}
              >
                <Sparkles size={14} />
                {badge}
              </div>
            )}

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
              style={{ color: theme.text }}
            >
              {title}
            </h1>

            {subtitle && (
              <p
                className="text-xl sm:text-2xl font-medium mb-4"
                style={{ color: theme.primaryColor }}
              >
                {subtitle}
              </p>
            )}

            {description && (
              <p
                className="text-lg sm:text-xl mb-8 max-w-2xl"
                style={{ color: theme.textMuted }}
              >
                {description}
              </p>
            )}

            <div className={`flex flex-wrap gap-4 ${isSplit ? '' : 'justify-center'}`}>
              {cta && <CTAButton cta={cta} theme={theme} />}
              {secondaryCta && <CTAButton cta={secondaryCta} theme={theme} secondary />}
            </div>
          </div>

          {(heroImage || heroVideo) && isSplit && (
            <div className="flex-1 relative">
              {heroImage && (
                <img
                  src={heroImage}
                  alt={title}
                  className="w-full rounded-2xl shadow-2xl"
                  style={{ borderRadius: getBorderRadius(theme.borderRadius) }}
                />
              )}
              {heroVideo && (
                <video
                  src={heroVideo}
                  className="w-full rounded-2xl shadow-2xl"
                  style={{ borderRadius: getBorderRadius(theme.borderRadius) }}
                  controls
                />
              )}
            </div>
          )}
        </div>

        {!isSplit && (heroImage || heroVideo) && (
          <div className="mt-12 lg:mt-16 relative">
            {heroImage && (
              <img
                src={heroImage}
                alt={title}
                className="w-full max-w-4xl mx-auto rounded-2xl shadow-2xl"
                style={{ borderRadius: getBorderRadius(theme.borderRadius) }}
              />
            )}
            {heroVideo && (
              <video
                src={heroVideo}
                className="w-full max-w-4xl mx-auto rounded-2xl shadow-2xl"
                style={{ borderRadius: getBorderRadius(theme.borderRadius) }}
                controls
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function CTAButton({
  cta,
  theme,
  secondary = false,
}: {
  cta: CTA;
  theme: UITheme;
  secondary?: boolean;
}) {
  const baseClasses = 'inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200';

  const variantStyles = secondary
    ? {
        background: 'transparent',
        color: theme.text,
        border: `2px solid ${theme.textMuted}`,
      }
    : {
        background: theme.primaryColor,
        color: '#ffffff',
        border: 'none',
      };

  return (
    <button
      className={baseClasses}
      style={{
        ...variantStyles,
        borderRadius: getBorderRadius(theme.borderRadius),
      }}
    >
      {cta.label}
      {!secondary && <ArrowRight size={18} />}
    </button>
  );
}

function getBorderRadius(radius: string): string {
  const map: Record<string, string> = {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  };
  return map[radius] || '12px';
}
