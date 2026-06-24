'use client';

import React from 'react';
import { useProject } from '@/lib/crm/store';
import { Activity, Database, Users, Link as LinkIcon, BarChart3, Plus } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';

export default function ProjectDashboard({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { project } = useProject(projectId);

  if (!project) return null;

  const stats = [
    { label: 'Total Tables', value: project.tables.length, icon: Database, href: `/crm/${projectId}/tables` },
    { label: 'Integrations', value: project.integrations.length, icon: LinkIcon, href: `/crm/${projectId}/integrations` },
    { label: 'Team Members', value: project.team.length, icon: Users, href: `/crm/${projectId}/team` },
    { label: 'Active Views', value: project.tables.reduce((a, t) => a + t.views.length, 0), icon: Activity, href: `/crm/${projectId}/views` },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-[#e5e7eb] bg-white px-8 py-5">
        <h1 className="text-lg font-semibold text-[#111827]">Dashboard</h1>
        <p className="mt-0.5 text-sm text-[#6b7280]">Overview for {project.name}.</p>
      </div>

      <div className="flex-1 p-8">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <Link
              key={i}
              href={stat.href}
              className="group flex flex-col justify-between rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm transition-all hover:border-[#7c3aed]/30 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#6b7280]">{stat.label}</span>
                <stat.icon className="h-4 w-4 text-[#d1d5db] transition-colors group-hover:text-[#7c3aed]" />
              </div>
              <div className="mt-4 text-3xl font-bold text-[#111827] tracking-tight">
                {stat.value}
              </div>
            </Link>
          ))}
        </div>

        {/* Resources */}
        <div className="mt-10">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#111827]">Resources & Metrics</h2>
            <button className="flex items-center gap-1.5 text-sm font-medium text-[#7c3aed] hover:text-[#6d28d9]">
              <Plus className="h-4 w-4" />
              Add Resource
            </button>
          </div>

          {project.resources.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-[#d1d5db] bg-white">
              <BarChart3 className="mb-3 h-7 w-7 text-[#d1d5db]" />
              <h3 className="text-sm font-medium text-[#374151]">No resources configured</h3>
              <p className="mt-1 text-sm text-[#9ca3af] text-center max-w-sm">
                Create metrics, summary cards, and custom widgets to monitor your CRM data.
              </p>
              <button className="mt-4 flex items-center gap-2 rounded-md bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white hover:bg-[#6d28d9]">
                <Plus className="h-4 w-4" />
                Create Resource
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {project.resources.map(res => (
                <div key={res.id} className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
                  <h4 className="text-sm font-medium text-[#111827]">{res.name}</h4>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
