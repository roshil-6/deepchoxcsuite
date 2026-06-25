'use client';

import React, { useState } from 'react';
import { useProject, generateId } from '@/lib/crm/store';
import { Plus, Trash2, Link as LinkIcon, Database, Server, Compass, Check } from 'lucide-react';
import { use } from 'react';

export default function IntegrationsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { project, updateProject } = useProject(projectId);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [dbName, setDbName] = useState('');
  const [dbDialect, setDbDialect] = useState<'postgres' | 'mysql' | 'sqlite'>('postgres');
  const [dbUri, setDbUri] = useState('');

  if (!project) return null;

  const handleAddIntegration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbName.trim() || !dbUri.trim()) return;

    const newIntegration = {
      id: generateId(),
      name: dbName.trim(),
      type: 'Database' as const,
      status: 'Active' as const,
      config: { dialect: dbDialect, connectionString: dbUri }
    };

    updateProject({
      ...project,
      integrations: [...(project.integrations || []), newIntegration],
      updatedAt: Date.now()
    });

    setDbName('');
    setDbUri('');
    setIsConfiguring(false);
  };

  const handleDeleteIntegration = (id: string) => {
    updateProject({
      ...project,
      integrations: project.integrations.filter(i => i.id !== id),
      updatedAt: Date.now()
    });
  };

  const integrationOptions = [
    { name: 'API Connection', desc: 'Connect to external REST APIs and sync resources.' },
    { name: 'Webhook', desc: 'Receive data from external systems via generated endpoints.' },
    { name: 'Embedded Forms', desc: 'Generate embeddable HTML forms for your website.' },
    { name: 'CSV Import', desc: 'Bulk import records by uploading a CSV file.' },
    { name: 'Internal Storage', desc: 'Use CRM Builder as your primary operational database.' },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#e5e7eb] bg-white px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#111827]">Integrations</h1>
          <p className="mt-0.5 text-sm text-[#6b7280]">Connect your CRM to external data sources.</p>
        </div>
        <button
          onClick={() => setIsConfiguring(true)}
          className="flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" />
          Connect Database
        </button>
      </div>

      <div className="flex-1 p-8 space-y-8 overflow-y-auto">
        {isConfiguring && (
          <div className="rounded-xl border border-[#ede9fe] bg-[#faf5ff] p-5 max-w-md">
            <h3 className="text-sm font-medium text-[#374151] mb-3 flex items-center gap-1.5">
              <Database className="h-4 w-4 text-violet-600" />
              Connect External Database
            </h3>
            <form onSubmit={handleAddIntegration} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Connection Name</label>
                <input
                  type="text"
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value)}
                  placeholder="e.g. Postgres Warehouse"
                  className="w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#7c3aed]"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Dialect</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['postgres', 'mysql', 'sqlite'] as const).map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDbDialect(d)}
                      className={`border rounded-lg p-2 text-center text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
                        dbDialect === d
                          ? 'border-violet-600 bg-violet-50 text-violet-700'
                          : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Connection URI</label>
                <input
                  type="text"
                  value={dbUri}
                  onChange={(e) => setDbUri(e.target.value)}
                  placeholder="postgresql://user:pass@host:5432/dbname"
                  className="w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#7c3aed]"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfiguring(false)}
                  className="rounded-md px-4 py-2 text-sm font-medium text-[#6b7280] hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!dbName.trim() || !dbUri.trim()}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  Connect
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Sync Status / Configured connections */}
        {project.integrations && project.integrations.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-[#111827] mb-3 flex items-center gap-1.5">
              <Server className="h-4.5 w-4.5 text-[#7c3aed]" />
              Active Connections
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {project.integrations.map(conn => (
                <div key={conn.id} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-semibold text-[#111827] flex items-center gap-1.5">
                        <Database className="h-4 w-4 text-emerald-600" />
                        {conn.name}
                      </h3>
                      <p className="mt-1.5 text-xs text-zinc-500 font-mono truncate max-w-[200px]">
                        {conn.config?.connectionString}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteIntegration(conn.id)}
                      className="text-zinc-400 hover:text-red-600 p-1 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                    <Check className="h-3.5 w-3.5" />
                    Connected & Synced
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rest of integration options */}
        <div>
          <h2 className="text-sm font-semibold text-[#111827] mb-3 flex items-center gap-1.5">
            <Compass className="h-4.5 w-4.5 text-[#7c3aed]" />
            Discovery Channels
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {integrationOptions.map((opt, i) => (
              <div key={i} className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm hover:border-[#7c3aed]/30 hover:shadow-md transition-all">
                <h3 className="text-[14px] font-semibold text-[#111827]">{opt.name}</h3>
                <p className="mt-1.5 text-xs text-[#6b7280] leading-relaxed">{opt.desc}</p>
                <button className="mt-4 rounded-md border border-[#e5e7eb] px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50">
                  Configure
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
