'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useProjects } from '@/lib/crm/store';
import { Plus, MoreVertical, Building2, Search, Clock } from 'lucide-react';
import { NewProjectModal } from '@/components/crm/NewProjectModal';

export default function ProjectsPage() {
  const { projects } = useProjects();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold text-[#111827]">Projects</h1>
          <p className="mt-0.5 text-sm text-[#6b7280]">Manage your CRM projects and workspaces.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-md bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#6d28d9]"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      <div className="flex-1 p-8">
        {/* Search */}
        <div className="mb-6 flex max-w-sm items-center gap-2 rounded-md border border-[#e5e7eb] bg-white px-3 py-2 shadow-sm">
          <Search className="h-4 w-4 text-[#9ca3af]" />
          <input
            type="text"
            placeholder="Search projects..."
            className="flex-1 bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#d1d5db] bg-white">
            <Building2 className="mb-3 h-8 w-8 text-[#d1d5db]" />
            <h3 className="text-sm font-medium text-[#374151]">No projects yet</h3>
            <p className="mt-1 text-sm text-[#9ca3af]">Create your first CRM project to get started.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 flex items-center gap-2 rounded-md bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white hover:bg-[#6d28d9]"
            >
              <Plus className="h-4 w-4" />
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project) => (
              <Link
                key={project.id}
                href={`/crm/${project.id}`}
                className="group relative flex flex-col justify-between rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm transition-all hover:border-[#7c3aed]/30 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ede9fe]">
                      <Building2 className="h-5 w-5 text-[#7c3aed]" />
                    </div>
                    <button className="rounded-md p-1.5 text-[#9ca3af] opacity-0 transition-all hover:bg-[#f3f4f6] hover:text-[#374151] group-hover:opacity-100">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold text-[#111827]">{project.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-[#6b7280]">{project.description || 'No description.'}</p>
                </div>
                <div className="mt-5 flex items-center gap-4 text-xs text-[#9ca3af] border-t border-[#f3f4f6] pt-4">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </span>
                  <span>{project.tables.length} tables</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <NewProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}
