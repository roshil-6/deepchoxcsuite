'use client';

import React, { useState } from 'react';
import type { FormComponent, UITheme } from '@/lib/uiSchema';
import { Send, CheckCircle } from 'lucide-react';

interface FormSectionProps {
  component: FormComponent;
  theme: UITheme;
}

export function FormSection({ component, theme }: FormSectionProps) {
  const { title, description, fields, submitLabel, submitAction, successMessage, layout } = component;
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  if (submitted) {
    return (
      <section className="w-full py-16 lg:py-24" style={{ background: theme.surface }}>
        <div className="w-full max-w-xl mx-auto px-4 text-center">
          <CheckCircle size={64} style={{ color: '#22c55e' }} className="mx-auto mb-6" />
          <h3 className="text-2xl font-bold mb-2" style={{ color: theme.text }}>
            Thank You!
          </h3>
          <p style={{ color: theme.textMuted }}>
            {successMessage || 'Your submission has been received.'}
          </p>
        </div>
      </section>
    );
  }

  const isInline = layout === 'inline';
  const isCard = layout === 'card';

  return (
    <section className="w-full py-16 lg:py-24" style={{ background: theme.surface }}>
      <div className={`w-full max-w-2xl mx-auto px-4 ${isCard ? '' : ''}`}>
        <div
          className={isCard ? 'p-8 lg:p-10' : ''}
          style={{
            background: isCard ? theme.background : 'transparent',
            borderRadius: isCard ? getBorderRadius(theme.borderRadius) : undefined,
            border: isCard ? `1px solid ${theme.textMuted}15` : undefined,
          }}
        >
          {(title || description) && (
            <div className={`mb-8 ${isCard ? 'text-center' : ''}`}>
              {title && (
                <h2 className="text-2xl font-bold mb-3" style={{ color: theme.text }}>
                  {title}
                </h2>
              )}
              {description && (
                <p style={{ color: theme.textMuted }}>
                  {description}
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className={isInline ? 'flex flex-col sm:flex-row gap-4' : 'space-y-4'}>
            {fields.map((field) => (
              <div key={field.id} className={isInline ? 'flex-1' : ''}>
                {!isInline && (
                  <label
                    htmlFor={field.id}
                    className="block text-sm font-medium mb-1"
                    style={{ color: theme.text }}
                  >
                    {field.label}
                    {field.required && <span style={{ color: '#ef4444' }}> *</span>}
                  </label>
                )}

                {field.type === 'select' ? (
                  <select
                    id={field.id}
                    required={field.required}
                    className="w-full px-4 py-3 rounded-lg border text-sm"
                    style={{
                      background: theme.background,
                      borderColor: `${theme.textMuted}30`,
                      color: theme.text,
                      borderRadius: getBorderRadius(theme.borderRadius),
                    }}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                  >
                    <option value="">{field.placeholder || 'Select...'}</option>
                    {field.options?.map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    id={field.id}
                    placeholder={isInline ? field.label : field.placeholder}
                    required={field.required}
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border text-sm resize-none"
                    style={{
                      background: theme.background,
                      borderColor: `${theme.textMuted}30`,
                      color: theme.text,
                      borderRadius: getBorderRadius(theme.borderRadius),
                    }}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                  />
                ) : (
                  <input
                    id={field.id}
                    type={field.type}
                    placeholder={isInline ? field.label : field.placeholder}
                    required={field.required}
                    className="w-full px-4 py-3 rounded-lg border text-sm"
                    style={{
                      background: theme.background,
                      borderColor: `${theme.textMuted}30`,
                      color: theme.text,
                      borderRadius: getBorderRadius(theme.borderRadius),
                    }}
                    onChange={(e) => handleChange(field.id, e.target.value)}
                  />
                )}
              </div>
            ))}

            <button
              type="submit"
              className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${isInline ? 'sm:self-end' : 'w-full'}`}
              style={{
                background: theme.primaryColor,
                color: '#ffffff',
                borderRadius: getBorderRadius(theme.borderRadius),
              }}
            >
              {submitLabel}
              <Send size={18} />
            </button>
          </form>
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
    full: '24px',
  };
  return map[radius] || '12px';
}
