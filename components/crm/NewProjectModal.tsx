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
  const [tab, setTab] = useState<'manual' | 'ai'>('manual');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-[#e5e7eb] bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e7eb] px-5 py-4">
          <h2 className="text-base font-semibold text-[#111827]">Create New Project</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#e5e7eb] px-5 pt-1">
          <button
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              tab === 'manual'
                ? 'border-[#7c3aed] text-[#7c3aed]'
                : 'border-transparent text-[#6b7280] hover:text-[#374151]'
            }`}
            onClick={() => setTab('manual')}
          >
            <Layout className="h-4 w-4" />
            Manual Builder
          </button>
          <button
            className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              tab === 'ai'
                ? 'border-[#7c3aed] text-[#7c3aed]'
                : 'border-transparent text-[#6b7280] hover:text-[#374151]'
            }`}
            onClick={() => setTab('ai')}
          >
            <Sparkles className="h-4 w-4" />
            AI Builder
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {tab === 'manual' ? (
            <form onSubmit={handleManualSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#6b7280]">Project Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af] focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10"
                    placeholder="e.g., Sales CRM"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#6b7280]">Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-24 w-full resize-none rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af] focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10"
                    placeholder="Brief description of this project..."
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md px-4 py-2 text-sm font-medium text-[#6b7280] hover:bg-[#f3f4f6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="rounded-md bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white hover:bg-[#6d28d9] disabled:opacity-50"
                >
                  Create Project
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#6b7280]">Describe your business</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="h-32 w-full resize-none rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af] focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10"
                    placeholder="e.g., I operate a migration consultancy with ten employees. I need to track leads, clients, invoices, and appointments."
                    autoFocus
                  />
                </div>
                <div className="rounded-md border border-[#ede9fe] bg-[#faf5ff] p-3 text-xs text-[#7c3aed]">
                  AI will analyze your description and generate the necessary tables, fields, views, and relationships.
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md px-4 py-2 text-sm font-medium text-[#6b7280] hover:bg-[#f3f4f6]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAIGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="flex items-center gap-2 rounded-md bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white hover:bg-[#6d28d9] disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate CRM
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
