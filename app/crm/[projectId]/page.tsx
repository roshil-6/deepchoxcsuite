'use client';

import React from 'react';
import { useProject } from '@/lib/crm/store';
import { Activity, Database, Users, Link as LinkIcon, BarChart3, Plus, ArrowRight, Lightbulb, Compass, Code } from 'lucide-react';
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

  const directives = [
    {
      title: 'Define Table Schema',
      desc: 'Define custom tables, properties, and data types to hold leads, accounts, or support tickets.',
      href: `/crm/${projectId}/tables`,
      icon: Database
    },
    {
      title: 'Generate Collect Forms',
      desc: 'Build web-embeddable intake forms to inject records straight into your custom pipeline.',
      href: `/crm/${projectId}/forms`,
      icon: Code
    },
    {
      title: 'Connect Integrations',
      desc: 'Sync CRM resources with external databases, webhooks, or REST APIs automatically.',
      href: `/crm/${projectId}/integrations`,
      icon: LinkIcon
    }
  ];

  const supportQuotes = [
    "“The structure of your data determines the efficiency of your business workflow.” — Operations Masterclass",
    "“No-code database architectures allow operators to adapt faster than any developer could write code.” — SaaS Essentials",
    "“Operational clarity starts with well-defined database columns. Keep them simple, clean, and typed.” — CRM Architect Guide",
    "“Simplify customer operations by mapping out who your clients are, what they purchase, and when they contact you.” — Customer Success Manual",
    "“A dashboard's role is to keep team members aligned. Use checklists to guide daily productivity.” — Executive Playbook"
  ];

  // Simple deterministic select based on project name length to avoid hydration mismatch
  const quote = supportQuotes[project.name.length % supportQuotes.length];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-[#e5e7eb] bg-white px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#111827]">Dashboard</h1>
          <p className="mt-0.5 text-sm text-[#6b7280]">Overview for {project.name}.</p>
        </div>
        <div className="text-xs text-[#7c3aed] font-medium max-w-xs text-right hidden md:block">
          Operational Support Panel Active
        </div>
      </div>

      <div className="flex-1 px-6 py-5 space-y-6 overflow-y-auto">
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

        {/* Operational Insights & Quote Card */}
        <div className="rounded-xl border border-violet-100 bg-white p-5 shadow-sm flex items-start gap-4">
          <div className="mt-0.5 rounded-lg bg-[#ede9fe] p-2.5 text-[#7c3aed] shrink-0">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7c3aed] mb-1.5">Operational Guidance Quote</h3>
            <p className="text-sm font-serif italic text-zinc-750 leading-relaxed mb-3">
              {quote}
            </p>
            <div className="border-t border-[#f3f4f6] pt-2.5 text-xs text-[#6b7280] leading-relaxed">
              🚀 <strong>Workspace Directives:</strong> Customize your tables to track records, design high-converting client intake forms, and sync with your source databases to build a robust operations portal.
            </div>
          </div>
        </div>

        {/* Builder Directives */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Compass className="h-5 w-5 text-[#7c3aed]" />
            <h2 className="text-[15px] font-semibold text-[#111827]">Directives & Checklist</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {directives.map((dir, i) => (
              <Link
                key={i}
                href={dir.href}
                className="group flex flex-col justify-between p-5 rounded-xl border border-[#e5e7eb] bg-white hover:border-[#7c3aed]/30 hover:shadow-md transition-all"
              >
                <div>
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#ede9fe]">
                    <dir.icon className="h-4 w-4 text-[#7c3aed]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#111827]">{dir.title}</h3>
                  <p className="mt-1 text-xs text-[#6b7280] leading-relaxed">{dir.desc}</p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#7c3aed] group-hover:text-[#6d28d9]">
                  Get Started <ArrowRight className="h-3 w-3" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Resources */}
        <div>
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-[#7c3aed]" />
              <h2 className="text-[15px] font-semibold text-[#111827]">Resources & Metrics</h2>
            </div>
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
