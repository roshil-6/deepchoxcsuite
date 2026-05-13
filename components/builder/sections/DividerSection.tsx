'use client';

import React from 'react';
import type { DividerComponent, UITheme } from '@/lib/uiSchema';

interface DividerSectionProps {
  component: DividerComponent;
  theme: UITheme;
}

export function DividerSection({ component, theme }: DividerSectionProps) {
  const { style, spacing } = component;

  const getSpacing = () => {
    switch (spacing) {
      case 'sm': return 'py-4';
      case 'lg': return 'py-16';
      case 'md':
      default: return 'py-8';
    }
  };

  const renderDivider = () => {
    switch (style) {
      case 'gradient':
        return (
          <div
            className="h-px w-full max-w-md mx-auto"
            style={{
              background: `linear-gradient(90deg, transparent, ${theme.primaryColor}, transparent)`,
            }}
          />
        );
      case 'wave':
        return (
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="w-full h-12"
          >
            <path
              d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
              fill={theme.primaryColor}
              fillOpacity="0.1"
            />
          </svg>
        );
      case 'dots':
        return (
          <div className="flex items-center justify-center gap-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{ background: theme.textMuted }}
              />
            ))}
          </div>
        );
      case 'line':
      default:
        return (
          <div
            className="h-px w-full max-w-4xl mx-auto"
            style={{ background: `${theme.textMuted}30` }}
          />
        );
    }
  };

  return (
    <div className={`w-full ${getSpacing()}`} style={{ background: theme.background }}>
      {renderDivider()}
    </div>
  );
}
