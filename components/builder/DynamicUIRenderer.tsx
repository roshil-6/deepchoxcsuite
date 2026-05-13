'use client';

import React from 'react';
import type { UISchema, UIComponent } from '@/lib/uiSchema';
import { sanitizeSchemaForUi } from '@/lib/builderSafety';
import { NavbarSection } from './sections/NavbarSection';
import { HeroSection } from './sections/HeroSection';
import { FeaturesSection } from './sections/FeaturesSection';
import { StatsSection } from './sections/StatsSection';
import { TestimonialsSection } from './sections/TestimonialsSection';
import { PricingSection } from './sections/PricingSection';
import { FAQSection } from './sections/FAQSection';
import { CTASection } from './sections/CTASection';
import { TeamSection } from './sections/TeamSection';
import { FormSection } from './sections/FormSection';
import { GallerySection } from './sections/GallerySection';
import { LogosSection } from './sections/LogosSection';
import { TextSection } from './sections/TextSection';
import { FooterSection } from './sections/FooterSection';
import { DividerSection } from './sections/DividerSection';

interface DynamicUIRendererProps {
  schema: UISchema;
  className?: string;
  selectedSectionIndex?: number;
  onSelectSection?: (index: number) => void;
}

export function DynamicUIRenderer({
  schema,
  className = '',
  selectedSectionIndex = -1,
  onSelectSection,
}: DynamicUIRendererProps) {
  const { sections, theme } = sanitizeSchemaForUi(schema);

  const renderSection = (component: UIComponent, index: number) => {
    const type = (component as { type: string }).type;

    switch (type) {
      case 'navbar':
        return <NavbarSection key={index} component={component as Extract<UIComponent, { type: 'navbar' }>} theme={theme} />;
      case 'hero':
        return <HeroSection key={index} component={component as Extract<UIComponent, { type: 'hero' }>} theme={theme} />;
      case 'features':
        return <FeaturesSection key={index} component={component as Extract<UIComponent, { type: 'features' }>} theme={theme} />;
      case 'stats':
        return <StatsSection key={index} component={component as Extract<UIComponent, { type: 'stats' }>} theme={theme} />;
      case 'testimonials':
        return <TestimonialsSection key={index} component={component as Extract<UIComponent, { type: 'testimonials' }>} theme={theme} />;
      case 'pricing':
        return <PricingSection key={index} component={component as Extract<UIComponent, { type: 'pricing' }>} theme={theme} />;
      case 'faq':
        return <FAQSection key={index} component={component as Extract<UIComponent, { type: 'faq' }>} theme={theme} />;
      case 'cta':
        return <CTASection key={index} component={component as Extract<UIComponent, { type: 'cta' }>} theme={theme} />;
      case 'team':
        return <TeamSection key={index} component={component as Extract<UIComponent, { type: 'team' }>} theme={theme} />;
      case 'form':
        return <FormSection key={index} component={component as Extract<UIComponent, { type: 'form' }>} theme={theme} />;
      case 'gallery':
        return <GallerySection key={index} component={component as Extract<UIComponent, { type: 'gallery' }>} theme={theme} />;
      case 'logos':
        return <LogosSection key={index} component={component as Extract<UIComponent, { type: 'logos' }>} theme={theme} />;
      case 'text':
        return <TextSection key={index} component={component as Extract<UIComponent, { type: 'text' }>} theme={theme} />;
      case 'footer':
        return <FooterSection key={index} component={component as Extract<UIComponent, { type: 'footer' }>} theme={theme} />;
      case 'divider':
        return <DividerSection key={index} component={component as Extract<UIComponent, { type: 'divider' }>} theme={theme} />;
      default:
        console.warn(`Unknown section type: ${type}`);
        return null;
    }
  };

  return (
    <div
      className={`min-h-screen ${className}`}
      style={{
        background: theme.background,
        color: theme.text,
        fontFamily: theme.fontFamily,
      }}
    >
      {sections.map((section, index) => (
        <div
          key={`${section.type}-${index}`}
          onClick={() => onSelectSection?.(index)}
          className="relative transition-all"
          style={{
            outline: selectedSectionIndex === index ? `2px solid ${theme.primaryColor}` : '2px solid transparent',
            outlineOffset: '-2px',
            cursor: onSelectSection ? 'pointer' : 'default',
          }}
          title={onSelectSection ? `Section ${index + 1}: ${section.type}` : undefined}
        >
          {onSelectSection && (
            <span
              className="absolute top-2 left-2 z-20 text-[10px] px-2 py-1 rounded"
              style={{
                background: `${theme.primaryColor}dd`,
                color: '#fff',
                display: selectedSectionIndex === index ? 'inline-block' : 'none',
              }}
            >
              {section.type}
            </span>
          )}
          {renderSection(section, index)}
        </div>
      ))}
    </div>
  );
}

export { generateStandaloneHTML, generateReactCode } from '@/lib/builderCodegen';
