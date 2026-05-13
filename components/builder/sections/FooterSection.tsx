'use client';

import React from 'react';
import type { FooterComponent, UITheme } from '@/lib/uiSchema';
import { safeAnchorBindings, sanitizeMediaUrl } from '@/lib/builderSafety';
import { Twitter, Github, Linkedin, Instagram, Youtube } from 'lucide-react';

interface FooterSectionProps {
  component: FooterComponent;
  theme: UITheme;
}

const socialIconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  twitter: Twitter,
  github: Github,
  linkedin: Linkedin,
  instagram: Instagram,
  youtube: Youtube,
};

export function FooterSection({ component, theme }: FooterSectionProps) {
  const { logo, tagline, columns, bottomRow, newsletter } = component;
  const footerLogoSrc = sanitizeMediaUrl(logo?.image || '');

  return (
    <footer className="w-full py-12 lg:py-16" style={{ background: theme.surface }}>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            {footerLogoSrc ? (
              <img src={footerLogoSrc} alt={logo?.text || 'Logo'} className="h-8 w-auto mb-4" />
            ) : (
              <h3 className="text-lg font-bold mb-4" style={{ color: theme.text }}>
                {logo?.text || 'Brand'}
              </h3>
            )}
            {tagline && (
              <p className="text-sm mb-6" style={{ color: theme.textMuted }}>
                {tagline}
              </p>
            )}

            {/* Newsletter */}
            {newsletter && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2" style={{ color: theme.text }}>
                  {newsletter.title}
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder={newsletter.placeholder}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border"
                    style={{
                      background: theme.background,
                      borderColor: `${theme.textMuted}30`,
                      color: theme.text,
                      borderRadius: getBorderRadius(theme.borderRadius),
                    }}
                  />
                  <button
                    className="px-4 py-2 text-sm font-medium rounded-lg"
                    style={{
                      background: theme.primaryColor,
                      color: '#ffffff',
                      borderRadius: getBorderRadius(theme.borderRadius),
                    }}
                  >
                    {newsletter.buttonLabel}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Link Columns */}
          {columns.map((column, index) => (
            <div key={index}>
              <h4
                className="text-sm font-semibold uppercase tracking-wider mb-4"
                style={{ color: theme.text }}
              >
                {column.title}
              </h4>
              <ul className="space-y-3">
                {column.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a
                      {...safeAnchorBindings(link.href)}
                      className="text-sm transition-colors hover:opacity-80"
                      style={{ color: theme.textMuted }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Row */}
        {bottomRow && (
          <div
            className="mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
            style={{ borderTop: `1px solid ${theme.textMuted}20` }}
          >
            <p className="text-sm" style={{ color: theme.textMuted }}>
              {bottomRow.copyright || `© ${new Date().getFullYear()} All rights reserved.`}
            </p>

            <div className="flex items-center gap-6">
              {bottomRow.links?.map((link, index) => (
                <a
                  key={index}
                  {...safeAnchorBindings(link.href)}
                  className="text-sm transition-colors hover:opacity-80"
                  style={{ color: theme.textMuted }}
                >
                  {link.label}
                </a>
              ))}

              {bottomRow.socials && (
                <div className="flex items-center gap-3">
                  {bottomRow.socials.map((social, index) => {
                    const Icon = socialIconMap[social.platform];
                    return Icon ? (
                      <a
                        key={index}
                        {...safeAnchorBindings(social.href)}
                        className="transition-opacity hover:opacity-80"
                        style={{ color: theme.textMuted }}
                      >
                        <Icon size={20} />
                      </a>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}

function getBorderRadius(radius: string): string {
  const map: Record<string, string> = {
    none: '0',
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    full: '9999px',
  };
  return map[radius] || '8px';
}
