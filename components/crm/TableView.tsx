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

  const handleAddFieldClick = () => {
    const name = prompt('Enter field name:');
    if (!name) return;
    const type = prompt('Enter field type (Text, Long Text, Email, Phone, Number, Currency, Date, Checkbox, Dropdown, Multi Select, Status, Address, URL, File Upload, Image Upload, Relation, Formula, Auto Increment):', 'Text');
    if (!type) return;
    if (onAddField) {
      onAddField(name, type as any);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white">
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
                  onClick={handleAddFieldClick}
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
