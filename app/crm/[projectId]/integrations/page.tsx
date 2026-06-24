'use client';

import React from 'react';
import { useProject } from '@/lib/crm/store';
import { use } from 'react';

export default function IntegrationsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { project } = useProject(projectId);
  if (!project) return null;

  const integrationOptions = [
    { name: 'API Connection', desc: 'Connect to external REST APIs and sync resources.' },
    { name: 'Database Connection', desc: 'Read-only connection to PostgreSQL, MySQL, MongoDB, Supabase, or Firebase.' },
    { name: 'Webhook', desc: 'Receive data from external systems via generated endpoints.' },
    { name: 'Embedded Forms', desc: 'Generate embeddable HTML forms for your website.' },
    { name: 'CSV Import', desc: 'Bulk import records by uploading a CSV file.' },
    { name: 'Internal Storage', desc: 'Use CRM Builder as your primary operational database.' },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#e5e7eb] bg-white px-8 py-5">
        <h1 className="text-lg font-semibold text-[#111827]">Integrations</h1>
        <p className="mt-0.5 text-sm text-[#6b7280]">Connect your CRM to external data sources.</p>
      </div>
      <div className="flex-1 p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrationOptions.map((opt, i) => (
            <div key={i} className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm hover:border-[#7c3aed]/30 hover:shadow-md transition-all">
              <h3 className="text-[14px] font-semibold text-[#111827]">{opt.name}</h3>
              <p className="mt-1.5 text-xs text-[#6b7280] leading-relaxed">{opt.desc}</p>
              <button className="mt-4 rounded-md border border-[#e5e7eb] px-3 py-1.5 text-xs font-medium text-[#374151] hover:border-[#7c3aed] hover:text-[#7c3aed] transition-colors">
                Configure
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
