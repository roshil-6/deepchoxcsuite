'use client';

import React from 'react';
import type { TextComponent, UITheme } from '@/lib/uiSchema';
import { escapeHtml } from '@/lib/builderSafety';

interface TextSectionProps {
  component: TextComponent;
  theme: UITheme;
}

export function TextSection({ component, theme }: TextSectionProps) {
  const { content, align, size, maxWidth } = component;

  const getAlignClass = () => {
    switch (align) {
      case 'left': return 'text-left';
      case 'right': return 'text-right';
      case 'center':
      default: return 'text-center mx-auto';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm': return 'text-sm';
      case 'lg': return 'text-lg leading-relaxed';
      case 'xl': return 'text-xl leading-relaxed';
      case 'base':
      default: return 'text-base';
    }
  };

  const getMaxWidthClass = () => {
    switch (maxWidth) {
      case 'sm': return 'max-w-md';
      case 'md': return 'max-w-2xl';
      case 'lg': return 'max-w-4xl';
      case 'full':
      default: return 'max-w-none';
    }
  };

  return (
    <section className="w-full py-12 lg:py-16" style={{ background: theme.background }}>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`${getAlignClass()} ${getMaxWidthClass()}`}
          style={{ color: theme.text }}
        >
          <div
            className={`${getSizeClass()} prose prose-invert max-w-none`}
            style={{
              color: theme.text,
              '--tw-prose-body': theme.text,
              '--tw-prose-headings': theme.text,
              '--tw-prose-links': theme.primaryColor,
              '--tw-prose-bold': theme.text,
              '--tw-prose-counters': theme.textMuted,
              '--tw-prose-bullets': theme.textMuted,
              '--tw-prose-hr': theme.textMuted,
              '--tw-prose-quotes': theme.textMuted,
              '--tw-prose-quote-borders': theme.primaryColor,
              '--tw-prose-captions': theme.textMuted,
              '--tw-prose-code': theme.primaryColor,
              '--tw-prose-pre-code': theme.text,
              '--tw-prose-pre-bg': theme.surface,
              '--tw-prose-th-borders': theme.textMuted,
              '--tw-prose-td-borders': theme.textMuted,
            } as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: formatContent(content) }}
          />
        </div>
      </div>
    </section>
  );
}

function formatContent(content: string): string {
  const escaped = escapeHtml(content);
  return escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background: rgba(128,128,128,0.2); padding: 2px 4px; border-radius: 4px;">$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}
