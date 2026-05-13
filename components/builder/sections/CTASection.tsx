'use client';

import React from 'react';
import type { CTAComponent, UITheme } from '@/lib/uiSchema';
import { ArrowRight, Sparkles } from 'lucide-react';

interface CTASectionProps {
  component: CTAComponent;
  theme: UITheme;
}

export function CTASection({ component, theme }: CTASectionProps) {
  const { title, description, cta, secondaryCta, background, layout } = component;

  const getBackgroundStyle = () => {
    switch (background) {
      case 'gradient':
        return {
          background: `linear-gradient(135deg, ${theme.primaryColor}20 0%, ${theme.secondaryColor || theme.primaryColor}20 100%)`,
        };
      case 'dark':
        return {
          background: theme.surface,
        };
      case 'image':
        return {
          background: theme.surface,
          backgroundImage: `radial-gradient(circle at 50% 50%, ${theme.primaryColor}10 0%, transparent 70%)`,
        };
      default:
        return {
          background: theme.background,
        };
    }
  };

  const isSplit = layout === 'split';

  return (
    <section
      className="w-full py-16 lg:py-24"
      style={getBackgroundStyle()}
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`${isSplit ? 'grid lg:grid-cols-2 gap-12 items-center' : 'text-center max-w-3xl mx-auto'}`}
        >
          <div>
            {background === 'gradient' && (
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
                style={{
                  background: `${theme.primaryColor}30`,
                  color: theme.primaryColor,
                }}
              >
                <Sparkles size={14} />
                Get Started Today
              </div>
            )}

            <h2
              className="text-3xl sm:text-4xl font-bold mb-4"
              style={{ color: theme.text }}
            >
              {title}
            </h2>

            {description && (
              <p
                className="text-lg mb-8"
                style={{ color: theme.textMuted }}
              >
                {description}
              </p>
            )}

            <div className={`flex flex-wrap gap-4 ${isSplit ? '' : 'justify-center'}`}>
              <button
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200"
                style={{
                  background: theme.primaryColor,
                  color: '#ffffff',
                  borderRadius: getBorderRadius(theme.borderRadius),
                }}
              >
                {cta.label}
                <ArrowRight size={18} />
              </button>

              {secondaryCta && (
                <button
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200"
                  style={{
                    background: 'transparent',
                    color: theme.text,
                    border: `2px solid ${theme.textMuted}40`,
                    borderRadius: getBorderRadius(theme.borderRadius),
                  }}
                >
                  {secondaryCta.label}
                </button>
              )}
            </div>
          </div>

          {isSplit && (
            <div
              className="h-64 lg:h-80 rounded-2xl"
              style={{
                background: `linear-gradient(135deg, ${theme.primaryColor}30, ${theme.secondaryColor || theme.primaryColor}20)`,
                borderRadius: getBorderRadius(theme.borderRadius),
              }}
            />
          )}
        </div>
      </div>
    </section>
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
