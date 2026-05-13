'use client';

import React from 'react';
import type { TestimonialsComponent, UITheme } from '@/lib/uiSchema';
import { sanitizeMediaUrl } from '@/lib/builderSafety';
import { Quote, Star } from 'lucide-react';

interface TestimonialsSectionProps {
  component: TestimonialsComponent;
  theme: UITheme;
}

export function TestimonialsSection({ component, theme }: TestimonialsSectionProps) {
  const { title, description, layout, quotes } = component;

  const getLayoutClasses = () => {
    switch (layout) {
      case 'carousel':
        return 'flex overflow-x-auto gap-6 pb-4 snap-x';
      case 'marquee':
        return 'flex gap-6 animate-marquee';
      case 'single':
        return 'max-w-3xl mx-auto';
      case 'grid':
      default:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    }
  };

  return (
    <section className="w-full py-16 lg:py-24" style={{ background: theme.surface }}>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {(title || description) && (
          <div className="text-center mb-12">
            {title && (
              <h2 className="text-3xl font-bold mb-4" style={{ color: theme.text }}>
                {title}
              </h2>
            )}
            {description && (
              <p className="text-lg max-w-2xl mx-auto" style={{ color: theme.textMuted }}>
                {description}
              </p>
            )}
          </div>
        )}

        <div className={getLayoutClasses()}>
          {quotes.map((quote, index) => (
            <TestimonialCard key={quote.id || index} quote={quote} theme={theme} layout={layout} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({
  quote,
  theme,
  layout,
}: {
  quote: { quote: string; author: { name: string; role?: string; company?: string; image?: string }; rating?: number };
  theme: UITheme;
  layout: string;
}) {
  const isCarousel = layout === 'carousel';
  const isSingle = layout === 'single';
  const authorImg = quote.author.image ? sanitizeMediaUrl(quote.author.image) : '';

  return (
    <div
      className={`${isCarousel ? 'flex-shrink-0 w-80 snap-start' : ''} ${isSingle ? '' : ''}`}
      style={{
        background: theme.background,
        borderRadius: getBorderRadius(theme.borderRadius),
        border: `1px solid ${theme.textMuted}15`,
      }}
    >
      <div className={`p-6 ${isSingle ? 'text-center' : ''}`}>
        {/* Rating */}
        {quote.rating && quote.rating > 0 && (
          <div className={`flex gap-1 mb-4 ${isSingle ? 'justify-center' : ''}`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={16}
                fill={i < quote.rating! ? '#fbbf24' : 'transparent'}
                style={{ color: i < quote.rating! ? '#fbbf24' : theme.textMuted }}
              />
            ))}
          </div>
        )}

        {/* Quote Icon */}
        <Quote
          size={32}
          className="mb-4 opacity-30"
          style={{ color: theme.primaryColor }}
        />

        {/* Quote Text */}
        <p
          className={`text-lg mb-6 ${isSingle ? 'text-xl' : ''}`}
          style={{ color: theme.text }}
        >
          "{quote.quote}"
        </p>

        {/* Author */}
        <div className={`flex items-center gap-3 ${isSingle ? 'justify-center' : ''}`}>
          {authorImg && (
            <img
              src={authorImg}
              alt={quote.author.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          )}
          <div className="text-left">
            <p className="font-semibold" style={{ color: theme.text }}>
              {quote.author.name}
            </p>
            {(quote.author.role || quote.author.company) && (
              <p className="text-sm" style={{ color: theme.textMuted }}>
                {quote.author.role}
                {quote.author.role && quote.author.company && ' at '}
                {quote.author.company}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getBorderRadius(radius: string): string {
  const map: Record<string, string> = {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '24px',
  };
  return map[radius] || '12px';
}
