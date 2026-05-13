'use client';

import React, { useEffect, useState } from 'react';
import type { UIComponent, UISchema } from '@/lib/uiSchema';
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react';

interface SectionStudioProps {
  isDark: boolean;
  schema: UISchema | null;
  onSchemaChange: (next: UISchema) => void;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
}

const QUICK_ADD: Array<{ label: string; section: UIComponent }> = [
  {
    label: 'Hero',
    section: {
      type: 'hero',
      title: 'Your headline goes here',
      description: 'A short and crisp value proposition.',
      layout: 'center',
      cta: { label: 'Get started', variant: 'primary', action: 'scroll' },
    },
  },
  {
    label: 'Features',
    section: {
      type: 'features',
      title: 'Features',
      layout: 'grid',
      columns: 3,
      items: [
        { id: 'feature-1', title: 'Feature one', description: 'Describe your first feature.' },
        { id: 'feature-2', title: 'Feature two', description: 'Describe your second feature.' },
        { id: 'feature-3', title: 'Feature three', description: 'Describe your third feature.' },
      ],
    },
  },
  {
    label: 'Pricing',
    section: {
      type: 'pricing',
      title: 'Pricing',
      layout: 'cards',
      tiers: [
        { id: 'starter', name: 'Starter', price: { monthly: 0 }, features: ['Core features'] },
        { id: 'pro', name: 'Pro', price: { monthly: 29 }, features: ['Everything in Starter', 'Premium support'], highlighted: true },
      ],
      frequency: 'monthly',
    },
  },
  {
    label: 'FAQ',
    section: {
      type: 'faq',
      title: 'Frequently asked questions',
      layout: 'accordion',
      questions: [{ question: 'How does this work?', answer: 'This section is fully editable in JSON.' }],
    },
  },
];

export function SectionStudio({
  isDark,
  schema,
  onSchemaChange,
  selectedIndex,
  onSelectIndex,
}: SectionStudioProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sections = schema?.sections ?? [];
  const selected = sections[selectedIndex] ?? null;

  useEffect(() => {
    if (sections.length === 0) {
      setDraft('');
      return;
    }
    if (selectedIndex >= sections.length) {
      onSelectIndex(sections.length - 1);
      return;
    }
    if (!selected) {
      setDraft('');
      return;
    }
    setDraft(JSON.stringify(selected, null, 2));
    setError(null);
  }, [selected, sections.length, selectedIndex, onSelectIndex]);

  const updateSections = (nextSections: UIComponent[]) => {
    if (!schema) return;
    onSchemaChange({
      ...schema,
      sections: nextSections,
      updatedAt: Date.now(),
    });
  };

  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= sections.length) return;
    const next = [...sections];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    updateSections(next);
    onSelectIndex(nextIndex);
  };

  const duplicate = (index: number) => {
    const target = sections[index];
    if (!target) return;
    const clone = JSON.parse(JSON.stringify(target)) as UIComponent;
    const next = [...sections];
    next.splice(index + 1, 0, clone);
    updateSections(next);
    onSelectIndex(index + 1);
  };

  const remove = (index: number) => {
    const next = sections.filter((_, i) => i !== index);
    updateSections(next);
    onSelectIndex(Math.max(0, index - 1));
  };

  const applyDraft = () => {
    if (!schema || !selected) return;
    try {
      const parsed = JSON.parse(draft) as UIComponent;
      if (!parsed || typeof parsed !== 'object' || !('type' in parsed)) {
        throw new Error('Section JSON must include a `type` field.');
      }
      const next = [...sections];
      next[selectedIndex] = parsed;
      updateSections(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  };

  const addQuick = (section: UIComponent) => {
    const clone = JSON.parse(JSON.stringify(section)) as UIComponent;
    const next = [...sections, clone];
    updateSections(next);
    onSelectIndex(next.length - 1);
  };

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= sections.length || to >= sections.length) return;
    const next = [...sections];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    updateSections(next);
    onSelectIndex(to);
  };

  if (!schema) {
    return null;
  }

  return (
    <div
      className="w-[360px] border-l hidden xl:flex xl:flex-col"
      style={{ background: isDark ? '#0c0c0e' : '#ffffff', borderColor: isDark ? '#27272a' : '#e4e4e7' }}
    >
      <div className="p-3 border-b" style={{ borderColor: isDark ? '#27272a' : '#e4e4e7' }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>
          Section Studio
        </p>
      </div>

      <div className="p-3 border-b space-y-2" style={{ borderColor: isDark ? '#27272a' : '#e4e4e7' }}>
        <p className="text-[11px]" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>Quick Add</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_ADD.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => addQuick(item.section)}
              className="px-2 py-1 rounded text-[11px] inline-flex items-center gap-1"
              style={{ background: isDark ? '#18181b' : '#f4f4f5', color: isDark ? '#e4e4e7' : '#3f3f46' }}
            >
              <Plus size={12} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 border-b overflow-y-auto max-h-[220px]" style={{ borderColor: isDark ? '#27272a' : '#e4e4e7' }}>
        <div className="space-y-1">
          {sections.map((section, i) => (
            <div
              key={`${section.type}-${i}`}
              className="rounded border p-2"
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex == null) return;
                reorder(dragIndex, i);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              style={{
                borderColor: selectedIndex === i ? '#7456ff' : (isDark ? '#27272a' : '#e4e4e7'),
                background: selectedIndex === i ? (isDark ? '#18112a' : '#f6f2ff') : (isDark ? '#111114' : '#ffffff'),
                opacity: dragIndex === i ? 0.65 : 1,
              }}
            >
              <button
                type="button"
                onClick={() => onSelectIndex(i)}
                className="w-full text-left text-xs font-medium"
                style={{ color: isDark ? '#e4e4e7' : '#18181b' }}
              >
                {i + 1}. {section.type}
              </button>
              <div className="mt-2 flex items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} className="p-1 rounded" style={{ background: isDark ? '#232329' : '#f4f4f5' }}><ArrowUp size={12} /></button>
                <button type="button" onClick={() => move(i, 1)} className="p-1 rounded" style={{ background: isDark ? '#232329' : '#f4f4f5' }}><ArrowDown size={12} /></button>
                <button type="button" onClick={() => duplicate(i)} className="p-1 rounded" style={{ background: isDark ? '#232329' : '#f4f4f5' }}><Copy size={12} /></button>
                <button type="button" onClick={() => remove(i)} className="p-1 rounded" style={{ background: isDark ? '#2a1717' : '#ffecec', color: '#ef4444' }}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 flex-1 flex flex-col min-h-0">
        <p className="text-[11px] mb-2" style={{ color: isDark ? '#a1a1aa' : '#71717a' }}>Edit Selected Section JSON</p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full flex-1 rounded border p-2 text-xs font-mono"
          style={{
            background: isDark ? '#111114' : '#fafafa',
            borderColor: isDark ? '#27272a' : '#e4e4e7',
            color: isDark ? '#e4e4e7' : '#18181b',
          }}
        />
        {error && <p className="mt-2 text-[11px]" style={{ color: '#ef4444' }}>{error}</p>}
        <button
          type="button"
          onClick={applyDraft}
          className="mt-2 py-2 rounded text-xs font-medium"
          style={{ background: '#7456ff', color: '#fff' }}
        >
          Apply Section JSON
        </button>
      </div>
    </div>
  );
}
