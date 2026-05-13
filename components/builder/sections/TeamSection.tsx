'use client';

import React from 'react';
import type { TeamComponent, UITheme } from '@/lib/uiSchema';
import { safeAnchorBindings, sanitizeMediaUrl } from '@/lib/builderSafety';
import { Twitter, Linkedin, Github } from 'lucide-react';

interface TeamSectionProps {
  component: TeamComponent;
  theme: UITheme;
}

const socialIconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  twitter: Twitter,
  linkedin: Linkedin,
  github: Github,
};

export function TeamSection({ component, theme }: TeamSectionProps) {
  const { title, description, layout, members } = component;

  const getGridCols = () => {
    if (members.length <= 2) return 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto';
    if (members.length === 3) return 'grid-cols-1 md:grid-cols-3 max-w-4xl mx-auto';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
  };

  const getLayoutClasses = () => {
    switch (layout) {
      case 'list':
        return 'flex flex-col gap-6 max-w-2xl mx-auto';
      case 'cards':
        return `grid gap-6 ${getGridCols()}`;
      case 'grid':
      default:
        return `grid gap-8 ${getGridCols()}`;
    }
  };

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

        <div className={getLayoutClasses()}>
          {members.map((member, index) => (
            <TeamMemberCard key={member.id || index} member={member} theme={theme} layout={layout} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TeamMemberCard({
  member,
  theme,
  layout,
}: {
  member: { id: string; name: string; role: string; bio?: string; image?: string; socials?: { platform: string; href: string }[] };
  theme: UITheme;
  layout: string;
}) {
  const isList = layout === 'list';
  const headshot = member.image ? sanitizeMediaUrl(member.image) : '';

  return (
    <div
      className={`${isList ? 'flex items-center gap-4 p-4' : 'text-center p-6'}`}
      style={{
        background: theme.surface,
        borderRadius: getBorderRadius(theme.borderRadius),
        border: `1px solid ${theme.textMuted}15`,
      }}
    >
      {headshot && (
        <img
          src={headshot}
          alt={member.name}
          className={`object-cover ${isList ? 'w-20 h-20' : 'w-24 h-24 mx-auto mb-4'} rounded-full`}
        />
      )}

      <div className={isList ? 'flex-1' : ''}>
        <h3
          className="font-semibold text-lg"
          style={{ color: theme.text }}
        >
          {member.name}
        </h3>
        <p
          className="text-sm font-medium"
          style={{ color: theme.primaryColor }}
        >
          {member.role}
        </p>
        {member.bio && !isList && (
          <p className="text-sm mt-2" style={{ color: theme.textMuted }}>
            {member.bio}
          </p>
        )}

        {member.socials && member.socials.length > 0 && (
          <div className={`flex gap-3 ${isList ? 'mt-2' : 'justify-center mt-4'}`}>
            {member.socials.map((social, index) => {
              const Icon = socialIconMap[social.platform.toLowerCase()];
              return Icon ? (
                <a
                  key={index}
                  {...safeAnchorBindings(social.href)}
                  className="transition-opacity hover:opacity-70"
                  style={{ color: theme.textMuted }}
                >
                  <Icon size={18} />
                </a>
              ) : null;
            })}
          </div>
        )}
      </div>
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
