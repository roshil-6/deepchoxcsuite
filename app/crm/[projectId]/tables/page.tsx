'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useProject, generateId } from '@/lib/crm/store';
import { Database, Plus, MoreHorizontal, TableProperties } from 'lucide-react';
import type { Table, View } from '@/lib/crm/types';
import { use } from 'react';

export default function TablesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { project, updateProject } = useProject(projectId);
  const [isCreating, setIsCreating] = useState(false);
  const [newTableName, setNewTableName] = useState('');

  if (!project) return null;

  const handleCreateTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;
    const tableId = generateId();
    const defaultView: View = { id: generateId(), name: 'All Records', type: 'table' };
    const newTable: Table = {
      id: tableId,
      name: newTableName.trim(),
      views: [defaultView],
      fields: [{ id: generateId(), name: 'Name', type: 'Text' }]
    };
    updateProject({ ...project, tables: [...project.tables, newTable], updatedAt: Date.now() });
    setNewTableName('');
    setIsCreating(false);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold text-[#111827]">Tables</h1>
          <p className="mt-0.5 text-sm text-[#6b7280]">Manage the structure and schema of your CRM data.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 rounded-md bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white hover:bg-[#6d28d9]"
        >
          <Plus className="h-4 w-4" />
          Create Table
        </button>
      </div>

      <div className="flex-1 p-8">
        {isCreating && (
          <div className="mb-6 rounded-xl border border-[#ede9fe] bg-[#faf5ff] p-5">
            <h3 className="text-sm font-medium text-[#374151] mb-3">New Table</h3>
            <form onSubmit={handleCreateTable} className="flex gap-3">
              <input
                type="text"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="Table name (e.g. Clients)"
                className="flex-1 rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af] focus:border-[#7c3aed]"
                autoFocus
              />
              <button type="button" onClick={() => setIsCreating(false)} className="rounded-md px-4 py-2 text-sm font-medium text-[#6b7280] hover:bg-white">
                Cancel
              </button>
              <button type="submit" disabled={!newTableName.trim()} className="rounded-md bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white hover:bg-[#6d28d9] disabled:opacity-50">
                Create
              </button>
            </form>
          </div>
        )}

        {project.tables.length === 0 && !isCreating ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#d1d5db] bg-white">
            <Database className="mb-3 h-7 w-7 text-[#d1d5db]" />
            <h3 className="text-sm font-medium text-[#374151]">No tables yet</h3>
            <p className="mt-1 text-sm text-[#9ca3af]">Create your first table to start organizing data.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#f3f4f6] bg-[#fafafa] text-xs uppercase tracking-wider text-[#9ca3af]">
                <tr>
                  <th className="px-6 py-3.5 font-medium">Table Name</th>
                  <th className="px-6 py-3.5 font-medium">Fields</th>
                  <th className="px-6 py-3.5 font-medium">Views</th>
                  <th className="px-6 py-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f4f6]">
                {project.tables.map(table => (
                  <tr key={table.id} className="group hover:bg-[#fafafa] transition-colors">
                    <td className="px-6 py-3.5">
                      <Link href={`/crm/${project.id}/tables/${table.id}`} className="flex items-center gap-2.5 font-medium text-[#374151] hover:text-[#7c3aed]">
                        <TableProperties className="h-4 w-4 text-[#9ca3af] group-hover:text-[#7c3aed]" />
                        {table.name}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 text-[#6b7280]">{table.fields.length} fields</td>
                    <td className="px-6 py-3.5 text-[#6b7280]">{table.views.length} views</td>
                    <td className="px-6 py-3.5 text-right">
                      <button className="rounded-md p-1.5 text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151]">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
