'use client';

import React, { useState } from 'react';
import { useProjects, generateId, saveProjects, getProjects } from '@/lib/crm/store';
import { useRouter } from 'next/navigation';
import { X, Sparkles, Layout } from 'lucide-react';
import type { Project } from '@/lib/crm/types';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewProjectModal({ isOpen, onClose }: NewProjectModalProps) {
  const router = useRouter();
  const [tab, setTab] = useState<'manual' | 'ai' | 'db'>('manual');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [dbUrl, setDbUrl] = useState('');
  const [dbDialect, setDbDialect] = useState<'postgres' | 'mysql' | 'sqlite'>('postgres');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const newProject: Project = {
      id: generateId(),
      name: name.trim(),
      description: description.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tables: [],
      forms: [],
      team: [],
      integrations: [],
      resources: []
    };
    const projects = getProjects();
    saveProjects([...projects, newProject]);
    onClose();
    router.push(`/crm/${newProject.id}`);
  };

  const handleAIGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setTimeout(() => {
      const newProject: Project = {
        id: generateId(),
        name: 'AI Generated CRM',
        description: prompt.substring(0, 80),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tables: [
          {
            id: generateId(),
            name: 'Leads',
            views: [{ id: generateId(), name: 'All Leads', type: 'table' }],
            fields: [
              { id: generateId(), name: 'Name', type: 'Text' },
              { id: generateId(), name: 'Email', type: 'Email' },
              { id: generateId(), name: 'Status', type: 'Status', options: ['New', 'Contacted', 'Qualified', 'Lost'] }
            ]
          }
        ],
        forms: [],
        team: [],
        integrations: [],
        resources: []
      };
      const projects = getProjects();
      saveProjects([...projects, newProject]);
      setIsGenerating(false);
      onClose();
      router.push(`/crm/${newProject.id}`);
    }, 1500);
  };

  const handleConnectDb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbUrl.trim() || !name.trim()) return;
    setIsGenerating(true);

    // Simulate connecting to database and mapping schema elements automatically
    setTimeout(() => {
      const newProject: Project = {
        id: generateId(),
        name: name.trim(),
        description: `Imported CRM from ${dbDialect} server. Connection: ${dbUrl.substring(0, 30)}...`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tables: [
          {
            id: generateId(),
            name: 'imported_users',
            views: [{ id: generateId(), name: 'Active Users', type: 'table' }],
            fields: [
              { id: generateId(), name: 'id', type: 'Number' },
              { id: generateId(), name: 'email', type: 'Email' },
              { id: generateId(), name: 'name', type: 'Text' },
              { id: generateId(), name: 'created_at', type: 'Date' }
            ]
          },
          {
            id: generateId(),
            name: 'imported_orders',
            views: [{ id: generateId(), name: 'All Orders', type: 'table' }],
            fields: [
              { id: generateId(), name: 'id', type: 'Number' },
              { id: generateId(), name: 'amount', type: 'Currency' },
              { id: generateId(), name: 'status', type: 'Status', options: ['pending', 'completed', 'failed'] }
            ]
          }
        ],
        forms: [],
        team: [],
        integrations: [
          {
            id: generateId(),
            name: `${dbDialect.toUpperCase()} Sync`,
            type: 'Database',
            status: 'Active',
            config: { dialect: dbDialect, connectionString: dbUrl }
          }
        ],
        resources: [
          {
            id: generateId(),
            name: 'Database Health Indicator',
            type: 'Metric',
            config: { metric: 'connection', value: 'Healthy' }
          }
        ]
      };

      const projects = getProjects();
      saveProjects([...projects, newProject]);
      setIsGenerating(false);
      onClose();
      router.push(`/crm/${newProject.id}`);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-[4px]">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 className="text-base font-semibold text-zinc-900">Create New Project</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-100 px-5 pt-1 bg-zinc-50/50">
          <button
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
              tab === 'manual'
                ? 'border-violet-600 text-violet-600 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
            onClick={() => setTab('manual')}
          >
            <Layout className="h-3.5 w-3.5" />
            Manual Builder
          </button>
          <button
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
              tab === 'ai'
                ? 'border-violet-600 text-violet-600 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
            onClick={() => setTab('ai')}
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Builder
          </button>
          <button
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-all duration-150 ${
              tab === 'db'
                ? 'border-violet-600 text-violet-600 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
            onClick={() => setTab('db')}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            Connect Database
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {tab === 'manual' && (
            <form onSubmit={handleManualSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Project Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-violet-600"
                    placeholder="e.g., Sales CRM"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-24 w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-violet-600"
                    placeholder="Brief description of this project..."
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                >
                  Create Project
                </button>
              </div>
            </form>
          )}

          {tab === 'ai' && (
            <div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Describe your business</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="h-32 w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-violet-600"
                    placeholder="e.g., I operate a migration consultancy with ten employees. I need to track leads, clients, invoices, and appointments."
                    autoFocus
                  />
                </div>
                <div className="rounded-md border border-violet-100 bg-violet-50/50 p-3.5 text-xs text-violet-700 leading-relaxed">
                  AI will analyze your description and generate the necessary tables, fields, views, and relationships.
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAIGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Generate CRM
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {tab === 'db' && (
            <form onSubmit={handleConnectDb}>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Project Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-violet-600"
                    placeholder="e.g., Production DB CRM"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Database Dialect</label>
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
                    value={dbUrl}
                    onChange={(e) => setDbUrl(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-violet-600"
                    placeholder="postgresql://user:pass@host:5432/dbname"
                  />
                </div>
                <div className="rounded-md border border-emerald-100 bg-emerald-50/50 p-3.5 text-xs text-emerald-800 leading-relaxed">
                  Connect your existing database. CRM Builder will analyze tables, relationships, and types to generate a ready-to-use CRM portal.
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!dbUrl.trim() || !name.trim() || isGenerating}
                  className="flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Analyzing Database...
                    </>
                  ) : (
                    <>
                      Connect & Build
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
