'use client';

import React from 'react';
import type { StatsComponent, UITheme } from '@/lib/uiSchema';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsSectionProps {
  component: StatsComponent;
  theme: UITheme;
}

export function StatsSection({ component, theme }: StatsSectionProps) {
  const { title, description, layout, metrics } = component;

  const getLayoutClasses = () => {
    switch (layout) {
      case 'grid':
        return 'grid grid-cols-2 lg:grid-cols-4 gap-6';
      case 'cards':
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4';
      case 'row':
      default:
        return 'flex flex-col md:flex-row items-center justify-center gap-8 lg:gap-16';
    }
  };

  return (
    <section className="w-full py-12 lg:py-20" style={{ background: theme.background }}>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {(title || description) && (
          <div className="text-center mb-10 lg:mb-14">
            {title && (
              <h2 className="text-3xl font-bold mb-3" style={{ color: theme.text }}>
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
          {metrics.map((metric, index) => (
            <StatCard key={index} metric={metric} theme={theme} layout={layout} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatCard({
  metric,
  theme,
  layout,
}: {
  metric: { value: string; label: string; description?: string; prefix?: string; suffix?: string; trend?: 'up' | 'down' | 'neutral' };
  theme: UITheme;
  layout: string;
}) {
  const TrendIcon = metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : Minus;
  const trendColor = metric.trend === 'up' ? '#22c55e' : metric.trend === 'down' ? '#ef4444' : theme.textMuted;

  const isCardLayout = layout === 'cards';

  return (
    <div
      className={`text-center ${isCardLayout ? 'p-6 rounded-xl' : ''}`}
      style={{
        background: isCardLayout ? theme.surface : 'transparent',
        borderRadius: isCardLayout ? getBorderRadius(theme.borderRadius) : undefined,
      }}
    >
      <div className="flex items-center justify-center gap-2 mb-2">
        {metric.trend && (
          <TrendIcon size={16} style={{ color: trendColor }} />
        )}
        <span
          className="text-4xl lg:text-5xl font-bold"
          style={{ color: theme.primaryColor }}
        >
          {metric.prefix}
          {metric.value}
          {metric.suffix}
        </span>
      </div>

      <p
        className="text-sm font-medium uppercase tracking-wider"
        style={{ color: theme.text }}
      >
        {metric.label}
      </p>

      {metric.description && (
        <p className="text-sm mt-1" style={{ color: theme.textMuted }}>
          {metric.description}
        </p>
      )}
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
