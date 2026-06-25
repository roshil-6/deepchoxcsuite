'use client';

import React, { useState } from 'react';
import { useRecords, generateId } from '@/lib/crm/store';
import type { Table, RecordData } from '@/lib/crm/types';
import { Plus } from 'lucide-react';

interface TableViewProps {
  table: Table;
  onAddField?: (name: string, type: any) => void;
}

export function TableView({ table, onAddField }: TableViewProps) {
  const { records, updateRecords } = useRecords(table.id);
  const [editingCell, setEditingCell] = useState<{ recordId: string; fieldId: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('Text');

  const handleAddRecord = () => {
    const newRecord: RecordData = {
      id: generateId(),
      tableId: table.id,
      createdAt: Date.now(),
      data: {}
    };
    updateRecords([...records, newRecord]);
  };

  const handleCellChange = (recordId: string, fieldId: string, value: string) => {
    updateRecords(records.map(r =>
      r.id === recordId ? { ...r, data: { ...r.data, [fieldId]: value } } : r
    ));
  };

  const handleSubmitField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;
    if (onAddField) {
      onAddField(newFieldName.trim(), newFieldType);
    }
    setNewFieldName('');
    setNewFieldType('Text');
    setIsModalOpen(false);
  };

  const fieldTypes = [
    'Text', 'Long Text', 'Email', 'Phone', 'Number', 'Currency', 'Date', 'Checkbox', 'Dropdown', 'Status'
  ];

  return (
    <div className="flex h-full flex-col bg-white relative">
      {/* Field Creator Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-[4px]">
          <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden font-sans">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-zinc-900">Add Table Field</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700 text-xs"
              >
                Cancel
              </button>
            </div>
            <form onSubmit={handleSubmitField} className="p-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Field Name</label>
                <input
                  type="text"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="e.g. Phone Number"
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-violet-600"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-500 uppercase tracking-wider">Field Type</label>
                <select
                  value={newFieldType}
                  onChange={(e) => setNewFieldType(e.target.value)}
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-violet-600"
                >
                  {fieldTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFieldName.trim()}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                >
                  Add Field
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          {/* Column Headers */}
          <thead className="sticky top-0 z-10 border-b border-[#e5e7eb] bg-[#fafafa]">
            <tr>
              <th className="w-12 border-r border-[#f3f4f6] px-4 py-3 text-center text-xs font-medium text-[#9ca3af]">#</th>
              {table.fields.map(field => (
                <th
                  key={field.id}
                  className="min-w-[160px] border-r border-[#f3f4f6] px-4 py-3 text-left font-mono text-xs font-semibold text-[#374151] uppercase tracking-wider"
                >
                  {field.name}
                </th>
              ))}
              <th className="w-20 px-4 py-3">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-1 text-[#7c3aed] hover:text-[#6d28d9] text-xs font-medium"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Field
                </button>
              </th>
            </tr>
          </thead>

          {/* Rows */}
          <tbody className="divide-y divide-[#f3f4f6]">
            {records.map((record, index) => (
              <tr key={record.id} className="group hover:bg-[#fafafa] transition-colors">
                <td className="border-r border-[#f3f4f6] px-4 py-2 text-center text-xs text-[#9ca3af]">
                  {index + 1}
                </td>
                {table.fields.map(field => {
                  const isEditing = editingCell?.recordId === record.id && editingCell?.fieldId === field.id;
                  const value = record.data[field.id] || '';
                  return (
                    <td
                      key={field.id}
                      className="border-r border-[#f3f4f6] px-0 py-0 cursor-text"
                      onClick={() => setEditingCell({ recordId: record.id, fieldId: field.id })}
                    >
                      {isEditing ? (
                        <input
                          type="text"
                          autoFocus
                          defaultValue={value}
                          onBlur={(e) => {
                            handleCellChange(record.id, field.id, e.target.value);
                            setEditingCell(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCellChange(record.id, field.id, e.currentTarget.value);
                              setEditingCell(null);
                            }
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          className="w-full min-h-[38px] bg-[#ede9fe] px-4 py-2 text-sm text-[#111827] outline-none ring-inset ring-1 ring-[#7c3aed]"
                        />
                      ) : (
                        <div className="px-4 py-2 min-h-[38px] text-sm text-[#374151] truncate">
                          {value}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-2" />
              </tr>
            ))}

            {/* Add row */}
            <tr
              className="cursor-pointer hover:bg-[#faf5ff] transition-colors"
              onClick={handleAddRecord}
            >
              <td className="border-r border-[#f3f4f6] px-4 py-2 text-center text-[#9ca3af]">
                <Plus className="h-3.5 w-3.5 mx-auto" />
              </td>
              <td colSpan={table.fields.length + 1} className="px-4 py-2 text-sm text-[#9ca3af]">
                Add a record
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex h-10 items-center border-t border-[#e5e7eb] bg-[#fafafa] px-4 text-xs text-[#9ca3af]">
        {records.length} record{records.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
