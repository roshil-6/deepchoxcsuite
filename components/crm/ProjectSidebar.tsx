'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Table2,
  FormInput,
  LayoutTemplate,
  Plug,
  Users,
  Settings,
  ChevronLeft
} from 'lucide-react';
import { useProject } from '@/lib/crm/store';

export function ProjectSidebar({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const { project } = useProject(projectId);

  const navItems = [
    { name: 'Dashboard', href: `/crm/${projectId}`, icon: LayoutDashboard },
    { name: 'Tables', href: `/crm/${projectId}/tables`, icon: Table2 },
    { name: 'Forms', href: `/crm/${projectId}/forms`, icon: FormInput },
    { name: 'Views', href: `/crm/${projectId}/views`, icon: LayoutTemplate },
    { name: 'Integrations', href: `/crm/${projectId}/integrations`, icon: Plug },
    { name: 'Team', href: `/crm/${projectId}/team`, icon: Users },
    { name: 'Settings', href: `/crm/${projectId}/settings`, icon: Settings },
  ];

  return (
    <div className="flex w-48 shrink-0 flex-col border-r border-[#e5e7eb] bg-[#fafafa]">
      {/* Header */}
      <div className="flex h-14 items-center gap-2 px-4 border-b border-[#e5e7eb]">
        <Link
          href="/crm/projects"
          className="rounded-md p-1 text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <span className="truncate text-[13px] font-semibold text-[#111827]">
          {project?.name || '—'}
        </span>
      </div>

      {/* Nav */}
      <div className="flex-1 px-3 py-4">
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isExact = pathname === item.href;
            const isNested = pathname.startsWith(item.href + '/');
            const isActive = isExact || (isNested && item.href !== `/crm/${projectId}`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#ede9fe] text-[#6d28d9]'
                    : 'text-[#374151] hover:bg-[#f3f4f6] hover:text-[#111827]'
                }`}
              >
                <item.icon className={`h-[16px] w-[16px] ${isActive ? 'text-[#7c3aed]' : 'text-[#9ca3af]'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
