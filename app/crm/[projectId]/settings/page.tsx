'use client';

import React from 'react';
import { useProject, getProjects, saveProjects } from '@/lib/crm/store';
import { useRouter } from 'next/navigation';
import { use } from 'react';

export default function SettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { project, updateProject } = useProject(projectId);
  const router = useRouter();
  if (!project) return null;

  const handleDelete = () => {
    if (confirm('Are you sure? This action cannot be undone.')) {
      saveProjects(getProjects().filter(p => p.id !== project.id));
      router.push('/crm/projects');
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#e5e7eb] bg-white px-8 py-5">
        <h1 className="text-lg font-semibold text-[#111827]">Settings</h1>
        <p className="mt-0.5 text-sm text-[#6b7280]">Manage {project.name} configuration.</p>
      </div>
      <div className="flex-1 p-8">
        <div className="max-w-xl space-y-8">
          {/* Project Details */}
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-[#111827] mb-4">Project Details</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#6b7280]">Project Name</label>
                <input
                  type="text"
                  value={project.name}
                  onChange={(e) => updateProject({ ...project, name: e.target.value })}
                  className="w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#6b7280]">Description</label>
                <textarea
                  value={project.description}
                  onChange={(e) => updateProject({ ...project, description: e.target.value })}
                  className="h-24 w-full resize-none rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10"
                />
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <h3 className="text-sm font-semibold text-red-700 mb-1">Danger Zone</h3>
            <p className="text-sm text-red-500 mb-4">Permanently delete this project and all of its data.</p>
            <button
              onClick={handleDelete}
              className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-600 hover:text-white"
            >
              Delete Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
