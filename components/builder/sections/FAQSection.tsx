'use client';

import React, { useState } from 'react';
import type { FAQComponent, UITheme } from '@/lib/uiSchema';
import { ChevronDown } from 'lucide-react';

interface FAQSectionProps {
  component: FAQComponent;
  theme: UITheme;
}

export function FAQSection({ component, theme }: FAQSectionProps) {
  const { title, description, layout, questions } = component;

  const isAccordion = layout === 'accordion' || layout === undefined;

  return (
    <section className="w-full py-16 lg:py-24" style={{ background: theme.surface }}>
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {(title || description) && (
          <div className="text-center mb-12">
            {title && (
              <h2 className="text-3xl font-bold mb-4" style={{ color: theme.text }}>
                {title}
              </h2>
            )}
            {description && (
              <p className="text-lg" style={{ color: theme.textMuted }}>
                {description}
              </p>
            )}
          </div>
        )}

        <div className="space-y-4">
          {questions.map((q, index) => (
            isAccordion ? (
              <FAQAccordionItem key={index} question={q} theme={theme} />
            ) : (
              <FAQSimpleItem key={index} question={q} theme={theme} />
            )
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQAccordionItem({
  question,
  theme,
}: {
  question: { question: string; answer: string };
  theme: UITheme;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="overflow-hidden"
      style={{
        background: theme.background,
        borderRadius: getBorderRadius(theme.borderRadius),
        border: `1px solid ${theme.textMuted}15`,
      }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <span
          className="font-medium pr-4"
          style={{ color: theme.text }}
        >
          {question.question}
        </span>
        <ChevronDown
          size={20}
          className="flex-shrink-0 transition-transform"
          style={{
            color: theme.textMuted,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      <div
        className="overflow-hidden transition-all duration-300"
        style={{
          maxHeight: isOpen ? '500px' : '0',
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div
          className="px-5 pb-5"
          style={{
            color: theme.textMuted,
            borderTop: isOpen ? `1px solid ${theme.textMuted}10` : 'none',
          }}
        >
          <p className="pt-4">{question.answer}</p>
        </div>
      </div>
    </div>
  );
}

function FAQSimpleItem({
  question,
  theme,
}: {
  question: { question: string; answer: string };
  theme: UITheme;
}) {
  return (
    <div
      className="p-5"
      style={{
        background: theme.background,
        borderRadius: getBorderRadius(theme.borderRadius),
        border: `1px solid ${theme.textMuted}15`,
      }}
    >
      <h3
        className="font-semibold mb-2"
        style={{ color: theme.text }}
      >
        {question.question}
      </h3>
      <p style={{ color: theme.textMuted }}>
        {question.answer}
      </p>
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
