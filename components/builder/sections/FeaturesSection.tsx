'use client';

import React from 'react';
import type { FeaturesComponent, FeatureItem, UITheme } from '@/lib/uiSchema';
import { sanitizeMediaUrl } from '@/lib/builderSafety';
import { Zap, Check, Star, Shield, Rocket, BarChart, Users, Lock } from 'lucide-react';

interface FeaturesSectionProps {
  component: FeaturesComponent;
  theme: UITheme;
}

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  zap: Zap,
  check: Check,
  star: Star,
  shield: Shield,
  rocket: Rocket,
  barchart: BarChart,
  users: Users,
  lock: Lock,
};

export function FeaturesSection({ component, theme }: FeaturesSectionProps) {
  const { title, description, layout, columns = 3, items } = component;

  const getGridClasses = () => {
    if (layout === 'grid' || layout === 'cards') {
      return `grid gap-6 ${columns === 2 ? 'grid-cols-1 md:grid-cols-2' : columns === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`;
    }
    if (layout === 'list') {
      return 'flex flex-col gap-4';
    }
    if (layout === 'bento') {
      return 'grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr';
    }
    return 'grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  };

  return (
    <section className="w-full py-16 lg:py-24" style={{ background: theme.surface }}>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {(title || description) && (
          <div className="text-center mb-12 lg:mb-16">
            {title && (
              <h2
                className="text-3xl sm:text-4xl font-bold mb-4"
                style={{ color: theme.text }}
              >
                {title}
              </h2>
            )}
            {description && (
              <p
                className="text-lg max-w-2xl mx-auto"
                style={{ color: theme.textMuted }}
              >
                {description}
              </p>
            )}
          </div>
        )}

        <div className={getGridClasses()}>
          {items.map((item, index) => (
            <FeatureCard
              key={item.id || index}
              item={item}
              theme={theme}
              layout={layout}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  item,
  theme,
  layout,
  index,
}: {
  item: FeatureItem;
  theme: UITheme;
  layout: string;
  index: number;
}) {
  const { icon, title, description, image } = item;
  const cardImage = image ? sanitizeMediaUrl(image) : '';

  const IconComponent = icon ? (iconMap[icon.toLowerCase()] || Zap) : null;

  const isBentoFeatured = layout === 'bento' && index === 0;

  const cardClasses = layout === 'list'
    ? 'flex items-start gap-4 p-4'
    : `flex flex-col p-6 lg:p-8 ${isBentoFeatured ? 'md:col-span-2 lg:col-span-2' : ''}`;

  return (
    <div
      className={cardClasses}
      style={{
        background: theme.background,
        borderRadius: getBorderRadius(theme.borderRadius),
        border: `1px solid ${theme.textMuted}20`,
      }}
    >
      {cardImage && (
        <img
          src={cardImage}
          alt={title}
          className="w-full h-48 object-cover mb-4 rounded-lg"
        />
      )}

      {IconComponent && !cardImage && (
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
          style={{
            background: `${theme.primaryColor}20`,
            color: theme.primaryColor,
          }}
        >
          <IconComponent size={24} />
        </div>
      )}

      {!IconComponent && !cardImage && icon && (
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-2xl"
          style={{
            background: `${theme.primaryColor}20`,
          }}
        >
          {icon}
        </div>
      )}

      <h3
        className="text-xl font-semibold mb-2"
        style={{ color: theme.text }}
      >
        {title}
      </h3>

      <p style={{ color: theme.textMuted }}>{description}</p>
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
