'use client';

import React, { useState } from 'react';
import type { PricingComponent, UITheme } from '@/lib/uiSchema';
import { Check, Sparkles } from 'lucide-react';

interface PricingSectionProps {
  component: PricingComponent;
  theme: UITheme;
}

export function PricingSection({ component, theme }: PricingSectionProps) {
  const { title, description, layout, tiers, frequency } = component;
  const [isYearly, setIsYearly] = useState(frequency === 'yearly');

  const showToggle = frequency === 'both' || frequency === undefined;

  return (
    <section className="w-full py-16 lg:py-24" style={{ background: theme.background }}>
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

        {/* Toggle */}
        {showToggle && (
          <div className="flex justify-center mb-10">
            <div
              className="inline-flex items-center p-1 rounded-lg"
              style={{ background: theme.surface }}
            >
              <button
                onClick={() => setIsYearly(false)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all`}
                style={{
                  background: !isYearly ? theme.primaryColor : 'transparent',
                  color: !isYearly ? '#ffffff' : theme.textMuted,
                }}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all`}
                style={{
                  background: isYearly ? theme.primaryColor : 'transparent',
                  color: isYearly ? '#ffffff' : theme.textMuted,
                }}
              >
                Yearly
              </button>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className={`grid gap-6 ${getGridCols(tiers.length)}`}>
          {tiers.map((tier, index) => (
            <PricingCard
              key={tier.id || index}
              tier={tier}
              theme={theme}
              isYearly={isYearly}
              showToggle={showToggle}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function getGridCols(count: number): string {
  if (count === 1) return 'grid-cols-1 max-w-md mx-auto';
  if (count === 2) return 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto';
  if (count === 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
  return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
}

function PricingCard({
  tier,
  theme,
  isYearly,
  showToggle,
}: {
  tier: { id: string; name: string; description?: string; price: { monthly?: number; yearly?: number }; currency?: string; features: string[]; highlighted?: boolean; badge?: string; cta?: { label: string; variant: string } };
  theme: UITheme;
  isYearly: boolean;
  showToggle: boolean;
}) {
  const price = isYearly && tier.price.yearly ? tier.price.yearly : tier.price.monthly || 0;
  const currency = tier.currency || '$';

  const isHighlighted = tier.highlighted;

  return (
    <div
      className={`relative p-6 lg:p-8 ${isHighlighted ? 'lg:scale-105' : ''}`}
      style={{
        background: isHighlighted ? `${theme.primaryColor}10` : theme.surface,
        borderRadius: getBorderRadius(theme.borderRadius),
        border: isHighlighted ? `2px solid ${theme.primaryColor}` : `1px solid ${theme.textMuted}15`,
      }}
    >
      {/* Badge */}
      {tier.badge && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"
          style={{
            background: theme.primaryColor,
            color: '#ffffff',
          }}
        >
          <Sparkles size={12} />
          {tier.badge}
        </div>
      )}

      {/* Plan Name */}
      <h3
        className="text-xl font-bold mb-2"
        style={{ color: theme.text }}
      >
        {tier.name}
      </h3>

      {tier.description && (
        <p className="text-sm mb-4" style={{ color: theme.textMuted }}>
          {tier.description}
        </p>
      )}

      {/* Price */}
      <div className="mb-6">
        <span
          className="text-4xl font-bold"
          style={{ color: theme.text }}
        >
          {currency}{price}
        </span>
        {price > 0 && (
          <span className="text-sm ml-1" style={{ color: theme.textMuted }}>
            /{isYearly ? 'year' : 'month'}
          </span>
        )}
      </div>

      {/* CTA Button */}
      <button
        className="w-full py-3 rounded-lg font-medium mb-6 transition-all"
        style={{
          background: isHighlighted ? theme.primaryColor : 'transparent',
          color: isHighlighted ? '#ffffff' : theme.primaryColor,
          border: `2px solid ${theme.primaryColor}`,
          borderRadius: getBorderRadius(theme.borderRadius),
        }}
      >
        {tier.cta?.label || (price === 0 ? 'Get Started' : 'Subscribe')}
      </button>

      {/* Features */}
      <ul className="space-y-3">
        {tier.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check
              size={18}
              className="flex-shrink-0 mt-0.5"
              style={{ color: theme.primaryColor }}
            />
            <span className="text-sm" style={{ color: theme.textMuted }}>
              {feature}
            </span>
          </li>
        ))}
      </ul>
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
