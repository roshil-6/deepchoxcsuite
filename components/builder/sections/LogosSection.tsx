'use client';

import React from 'react';
import type { LogosComponent, UITheme } from '@/lib/uiSchema';
import { safeAnchorBindings, sanitizeMediaUrl } from '@/lib/builderSafety';

interface LogosSectionProps {
  component: LogosComponent;
  theme: UITheme;
}

export function LogosSection({ component, theme }: LogosSectionProps) {
  const { title, description, layout, logos, grayscale } = component;

  const getContainerClasses = () => {
    switch (layout) {
      case 'row':
        return 'flex flex-wrap items-center justify-center gap-8 lg:gap-12';
      case 'marquee':
        return 'flex gap-12 animate-marquee';
      case 'grid':
      default:
        return 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-12';
    }
  };

  return (
    <section className="w-full py-12 lg:py-16" style={{ background: theme.background }}>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {(title || description) && (
          <div className="text-center mb-8">
            {title && (
              <p
                className="text-sm font-medium uppercase tracking-wider mb-2"
                style={{ color: theme.textMuted }}
              >
                {title}
              </p>
            )}
            {description && (
              <p className="text-base" style={{ color: theme.textMuted }}>
                {description}
              </p>
            )}
          </div>
        )}

        <div className={getContainerClasses()}>
          {logos.map((logo, index) => (
            <LogoItem key={logo.id || index} logo={logo} theme={theme} grayscale={grayscale} />
          ))}
        </div>
      </div>
    </section>
  );
}

function LogoItem({
  logo,
  theme,
  grayscale,
}: {
  logo: { name: string; image: string; href?: string };
  theme: UITheme;
  grayscale?: boolean;
}) {
  const imgSrc = sanitizeMediaUrl(logo.image || '');
  const content = (
    <div
      className="flex items-center justify-center h-12 opacity-60 hover:opacity-100 transition-opacity"
      style={{ filter: grayscale ? 'grayscale(100%)' : 'none' }}
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={logo.name}
          className="h-full w-auto max-w-32 object-contain"
        />
      ) : (
        <span className="text-xs" style={{ color: theme.textMuted }}>
          {logo.name}
        </span>
      )}
    </div>
  );

  if (logo.href) {
    const link = safeAnchorBindings(logo.href);
    return (
      <a {...link} className="flex items-center justify-center">
        {content}
      </a>
    );
  }

  return content;
}
