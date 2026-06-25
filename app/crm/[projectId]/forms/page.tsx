'use client';

import React, { useState } from 'react';
import { useProject, generateId } from '@/lib/crm/store';
import { FormInput, Plus, Table2, Trash2 } from 'lucide-react';
import type { Form, FormField } from '@/lib/crm/types';
import { use } from 'react';

export default function FormsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { project, updateProject } = useProject(projectId);
  const [isCreating, setIsCreating] = useState(false);
  const [formName, setFormName] = useState('');
  const [selectedTableId, setSelectedTableId] = useState('');

  if (!project) return null;

  const handleCreateForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !selectedTableId) return;

    const targetTable = project.tables.find(t => t.id === selectedTableId);
    if (!targetTable) return;

    const defaultFields: FormField[] = targetTable.fields.map(f => ({
      id: generateId(),
      fieldId: f.id,
      label: f.name,
      required: false
    }));

    const newForm: Form = {
      id: generateId(),
      name: formName.trim(),
      tableId: selectedTableId,
      fields: defaultFields
    };

    updateProject({
      ...project,
      forms: [...(project.forms || []), newForm],
      updatedAt: Date.now()
    });

    setFormName('');
    setSelectedTableId('');
    setIsCreating(false);
  };

  const handleDeleteForm = (formId: string) => {
    updateProject({
      ...project,
      forms: project.forms.filter(f => f.id !== formId),
      updatedAt: Date.now()
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold text-[#111827]">Forms</h1>
          <p className="mt-0.5 text-sm text-[#6b7280]">Build visual forms to collect data into your tables.</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 rounded-md bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white hover:bg-[#6d28d9]"
        >
          <Plus className="h-4 w-4" />
          Create Form
        </button>
      </div>

      <div className="flex-1 p-8">
        {isCreating && (
          <div className="mb-6 rounded-xl border border-[#ede9fe] bg-[#faf5ff] p-5 max-w-md">
            <h3 className="text-sm font-medium text-[#374151] mb-3">New Form</h3>
            <form onSubmit={handleCreateForm} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#6b7280]">Form Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Lead Intake Form"
                  className="w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af] focus:border-[#7c3aed]"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#6b7280]">Target Table</label>
                <select
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  className="w-full rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#7c3aed]"
                >
                  <option value="">Select a table...</option>
                  {project.tables.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="rounded-md px-4 py-2 text-sm font-medium text-[#6b7280] hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formName.trim() || !selectedTableId}
                  className="rounded-md bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white hover:bg-[#6d28d9] disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        )}

        {(!project.forms || project.forms.length === 0) && !isCreating ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#d1d5db] bg-white">
            <FormInput className="mb-3 h-7 w-7 text-[#d1d5db]" />
            <h3 className="text-sm font-medium text-[#374151]">No forms created</h3>
            <p className="mt-1 text-sm text-[#9ca3af]">Create your first form to start collecting data.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {project.forms?.map(form => {
              const table = project.tables.find(t => t.id === form.tableId);
              return (
                <div key={form.id} className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-semibold text-[#111827]">{form.name}</h3>
                      <p className="mt-1 text-xs text-[#6b7280] flex items-center gap-1">
                        <Table2 className="h-3.5 w-3.5" />
                        Feeds into: {table?.name || 'Unknown Table'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteForm(form.id)}
                      className="text-[#9ca3af] hover:text-red-600 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button className="flex-1 rounded-md border border-[#e5e7eb] px-3 py-1.5 text-xs font-medium text-[#374151] hover:bg-[#f9fafb]">
                      View Form
                    </button>
                    <button className="rounded-md border border-[#e5e7eb] px-3 py-1.5 text-xs font-medium text-[#374151] hover:bg-[#f9fafb]">
                      Share Link
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
