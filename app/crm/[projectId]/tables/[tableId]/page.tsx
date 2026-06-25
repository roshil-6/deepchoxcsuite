'use client';

import React from 'react';
import { useProject } from '@/lib/crm/store';
import { TableView } from '@/components/crm/TableView';
import { ChevronDown, Filter, ArrowUpDown } from 'lucide-react';
import { use } from 'react';

export default function TableSpreadsheetPage({ params }: { params: Promise<{ projectId: string; tableId: string }> }) {
  const { projectId, tableId } = use(params);
  const { project, updateProject } = useProject(projectId);

  if (!project) return null;

  const table = project.tables.find(t => t.id === tableId);
  if (!table) return <div className="p-8 text-[#6b7280]">Table not found.</div>;

  const handleAddField = (name: string, type: any) => {
    const newField = { id: Math.random().toString(36).substring(2, 11), name, type };
    const updatedTables = project.tables.map(t => {
      if (t.id === tableId) {
        return { ...t, fields: [...t.fields, newField] };
      }
      return t;
    });
    updateProject({ ...project, tables: updatedTables, updatedAt: Date.now() });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-4 border-b border-[#e5e7eb] bg-white px-5 py-3">
        <span className="text-sm font-semibold text-[#111827]">{table.name}</span>
        <div className="h-4 w-px bg-[#e5e7eb]" />
        <button className="flex items-center gap-1.5 rounded-md border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-medium text-[#374151] hover:bg-[#f9fafb]">
          All Records
          <ChevronDown className="h-3.5 w-3.5 text-[#9ca3af]" />
        </button>
        <div className="h-4 w-px bg-[#e5e7eb]" />
        <button className="flex items-center gap-1.5 text-xs text-[#6b7280] hover:text-[#374151]">
          <Filter className="h-3.5 w-3.5" />
          Filter
        </button>
        <button className="flex items-center gap-1.5 text-xs text-[#6b7280] hover:text-[#374151]">
          <ArrowUpDown className="h-3.5 w-3.5" />
          Sort
        </button>
      </div>

      {/* Spreadsheet */}
      <div className="flex-1 overflow-hidden">
        <TableView table={table} onAddField={handleAddField} />
      </div>
    </div>
  );
}
