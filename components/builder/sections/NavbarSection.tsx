'use client';

import React, { useState } from 'react';
import type { NavbarComponent, UITheme } from '@/lib/uiSchema';
import { safeAnchorBindings, sanitizeMediaUrl } from '@/lib/builderSafety';
import { Menu, X } from 'lucide-react';

interface NavbarSectionProps {
  component: NavbarComponent;
  theme: UITheme;
}

export function NavbarSection({ component, theme }: NavbarSectionProps) {
  const { logo, links, cta, sticky, transparent } = component;
  const [mobileOpen, setMobileOpen] = useState(false);
  const logoBindings = safeAnchorBindings(logo?.href || '/');
  const logoSrc = sanitizeMediaUrl(logo?.image || '');

  const navClasses = `w-full z-50 ${sticky ? 'sticky top-0' : 'relative'}`;

  return (
    <nav
      className={navClasses}
      style={{
        background: transparent ? 'transparent' : `${theme.surface}f0`,
        backdropFilter: transparent ? 'none' : 'blur(12px)',
      }}
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <a
            {...logoBindings}
            className="flex items-center gap-2 font-bold text-xl"
            style={{ color: theme.text }}
          >
            {logoSrc ? (
              <img src={logoSrc} alt={logo?.text || 'Logo'} className="h-8 w-auto" />
            ) : (
              <span>{logo?.text || 'Brand'}</span>
            )}
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((link, index) => (
              <a
                key={index}
                {...safeAnchorBindings(link.href)}
                className="text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: theme.textMuted }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            {cta && (
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  background: theme.primaryColor,
                  color: '#ffffff',
                  borderRadius: getBorderRadius(theme.borderRadius),
                }}
              >
                {cta.label}
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ color: theme.text }}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          className="md:hidden absolute top-full left-0 right-0 border-t"
          style={{
            background: theme.surface,
            borderColor: `${theme.textMuted}20`,
          }}
        >
          <div className="px-4 py-4 space-y-2">
            {links.map((link, index) => (
              <a
                key={index}
                {...safeAnchorBindings(link.href)}
                className="block py-2 text-sm font-medium"
                style={{ color: theme.textMuted }}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            {cta && (
              <button
                className="w-full mt-4 px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  background: theme.primaryColor,
                  color: '#ffffff',
                  borderRadius: getBorderRadius(theme.borderRadius),
                }}
              >
                {cta.label}
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
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
