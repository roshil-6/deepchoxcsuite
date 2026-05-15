'use client';

import React from 'react';
import { Copy, History, Trash2, X } from 'lucide-react';
import type { BuilderHistoryItem, UISchema } from '@/lib/uiSchema';

interface HistorySidebarProps {
  isDark: boolean;
  showHistory: boolean;
  setShowHistory: (value: boolean) => void;
  history: BuilderHistoryItem[];
  currentSchema: UISchema | null;
  onLoad: (item: BuilderHistoryItem) => void;
  onDuplicate: (item: BuilderHistoryItem) => void;
  onDelete: (id: string) => void;
}

export function HistorySidebar({
  isDark,
  showHistory,
  setShowHistory,
  history,
  currentSchema,
  onLoad,
  onDuplicate,
  onDelete,
}: HistorySidebarProps) {
  if (!showHistory) return null;

  const panelBg = isDark ? '#08080a' : '#ffffff';
  const borderCol = isDark ? '#27272a' : '#e4e4e7';

  return (
    <>
      <button
        type="button"
        aria-label="Close history"
        className="fixed inset-0 z-[48] bg-black/50 backdrop-blur-[3px]"
        onClick={() => setShowHistory(false)}
      />
      <div
        className="fixed inset-y-0 left-0 z-[50] flex h-full w-[min(100%,420px)] flex-col shadow-2xl shadow-black/40"
        style={{ background: panelBg, borderRight: `1px solid ${borderCol}` }}
      >
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: isDark ? '#27272a' : '#e4e4e7' }}>
        <div className="flex items-center gap-2">
          <History size={18} style={{ color: '#7456ff' }} />
          <h3 className="font-medium" style={{ color: isDark ? '#ffffff' : '#18181b' }}>
            Your Designs
          </h3>
        </div>
        <button onClick={() => setShowHistory(false)} className="p-1.5 rounded-md" style={{ background: isDark ? '#27272a' : '#f4f4f5' }} type="button">
          <X size={16} style={{ color: isDark ? '#a1a1aa' : '#71717a' }} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {history.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: isDark ? '#71717a' : '#a1a1aa' }}>
            No designs yet. Create your first.
          </p>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-lg border cursor-pointer group transition-all ${currentSchema?.id === item.id ? 'ring-1' : ''}`}
              style={{
                background: isDark ? '#18181b' : '#fafafa',
                borderColor: isDark ? '#3f3f46' : '#e4e4e7',
              }}
              onClick={() => onLoad(item)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: isDark ? '#ffffff' : '#18181b' }}>
                    {item.name}
                  </p>
                  <p className="text-xs truncate mt-0.5" style={{ color: isDark ? '#71717a' : '#a1a1aa' }}>
                    {item.prompt.slice(0, 50)}...
                  </p>
                  <p className="text-[10px] mt-1.5" style={{ color: isDark ? '#52525b' : '#71717a' }}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate(item);
                    }}
                    className="p-1.5 rounded"
                    style={{ background: isDark ? '#27272a' : '#f4f4f5' }}
                    type="button"
                  >
                    <Copy size={14} style={{ color: isDark ? '#a1a1aa' : '#71717a' }} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                    className="p-1.5 rounded"
                    style={{ background: isDark ? '#27272a' : '#f4f4f5' }}
                    type="button"
                  >
                    <Trash2 size={14} style={{ color: '#ef4444' }} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </>
  );
}
