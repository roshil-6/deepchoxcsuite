'use client';

import React from 'react';
import { useProject } from '@/lib/crm/store';
import { LayoutTemplate, Plus } from 'lucide-react';
import { use } from 'react';

export default function ViewsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { project } = useProject(projectId);
  if (!project) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold text-[#111827]">Views</h1>
          <p className="mt-0.5 text-sm text-[#6b7280]">Manage kanban, calendar, and list views across your tables.</p>
        </div>
        <button className="flex items-center gap-2 rounded-md bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white hover:bg-[#6d28d9]">
          <Plus className="h-4 w-4" />
          Create View
        </button>
      </div>
      <div className="flex-1 p-8">
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#d1d5db] bg-white">
          <LayoutTemplate className="mb-3 h-7 w-7 text-[#d1d5db]" />
          <h3 className="text-sm font-medium text-[#374151]">No custom views</h3>
          <p className="mt-1 text-sm text-[#9ca3af]">Create your first view to visualize data differently.</p>
        </div>
      </div>
    </div>
  );
}
