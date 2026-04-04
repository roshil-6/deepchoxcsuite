'use client';

import React, { useState, useEffect } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import {
    Plus,
    Save,
    Trash2,
    Sparkles,
    PenLine,
    Bookmark,
    Lightbulb,
    HeartPulse,
} from 'lucide-react';

export type DiaryEntry = {
    id: string;
    title: string;
    content: string;
    mood?: string;
    tags: string[];
    timestamp: number;
};

const MOOD_STYLES: Record<string, string> = {
    positive: 'bg-zinc-600/25 text-zinc-200 border-zinc-500/35',
    negative: 'bg-zinc-700/35 text-zinc-300 border-zinc-600/45',
    alert: 'bg-zinc-600/30 text-zinc-200 border-zinc-500/40',
    neutral: 'bg-zinc-500/15 text-zinc-300 border-zinc-600/40',
};

export function IntelligenceDiary() {
    const { activeProject, updateProjectField } = useOffice();
    const [entries, setEntries] = useState<DiaryEntry[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [filterTag, setFilterTag] = useState<string | null>(null);
    const [simulatingAnalysis, setSimulatingAnalysis] = useState(false);

    useEffect(() => {
        if (activeProject?.diary) {
            const raw = activeProject.diary as DiaryEntry[];
            setEntries(raw.sort((a, b) => b.timestamp - a.timestamp));
        }
    }, [activeProject]);

    const handleSaveEntry = () => {
        if (!selectedEntry || !activeProject) return;

        setSimulatingAnalysis(true);
        setTimeout(() => setSimulatingAnalysis(false), 1200);

        const updatedEntries = entries.some((e) => e.id === selectedEntry.id)
            ? entries.map((e) => (e.id === selectedEntry.id ? selectedEntry : e))
            : [selectedEntry, ...entries];

        setEntries(updatedEntries.sort((a, b) => b.timestamp - a.timestamp));
        updateProjectField('diary', updatedEntries);
        setIsEditing(false);
    };

    const handleCreateEntry = () => {
        const newEntry: DiaryEntry = {
            id: Date.now().toString(),
            title: '',
            content: '',
            mood: 'neutral',
            tags: [],
            timestamp: Date.now(),
        };
        setEntries((prev) => [newEntry, ...prev]);
        setSelectedEntry(newEntry);
        setIsEditing(true);
    };

    const handleDeleteEntry = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Delete this entry? This cannot be undone.')) {
            const updated = entries.filter((entry) => entry.id !== id);
            setEntries(updated);
            updateProjectField('diary', updated);
            if (selectedEntry?.id === id) {
                setSelectedEntry(null);
                setIsEditing(false);
            }
        }
    };

    if (!activeProject) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-zinc-900 p-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-600 bg-zinc-800">
                    <PenLine className="h-8 w-8 text-zinc-400" strokeWidth={1.5} />
                </div>
                <h2 className="font-serif text-2xl text-zinc-100">Neural Diary</h2>
                <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
                    Select or create a venture to capture private signals, reflections, and strategic notes.
                </p>
            </div>
        );
    }

    const filtered = entries.filter((e) => !filterTag || e.tags.includes(filterTag));

    return (
        <div className="relative flex h-full min-h-0 w-full overflow-hidden font-sans text-zinc-200">
            <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            {/* Entries — editorial rail */}
            <aside className="flex h-full min-h-0 w-[min(100%,320px)] shrink-0 flex-col border-r border-zinc-700 bg-gradient-to-b from-zinc-900 to-zinc-950">
                <div className="border-b border-zinc-700 px-5 py-6">
                    <div className="mb-1 flex items-center gap-2 text-zinc-400">
                        <Bookmark className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em]">Neural diary</span>
                    </div>
                    <p className="font-serif text-lg leading-snug text-zinc-100">Reflections &amp; signals</p>
                    <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                        A quiet surface for thinking — not a terminal. Write in full sentences.
                    </p>
                    <button
                        type="button"
                        onClick={handleCreateEntry}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-600 bg-zinc-800 py-2.5 text-xs font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700"
                    >
                        <Plus className="h-4 w-4" strokeWidth={2} aria-hidden />
                        New entry
                    </button>
                </div>

                <div className="flex gap-1.5 overflow-x-auto border-b border-zinc-800 px-3 py-3">
                    {['Strategic', 'Blocker', 'Insight', 'Personal'].map((tag) => (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                            className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-medium transition ${
                                filterTag === tag
                                    ? 'bg-zinc-700 text-zinc-100 ring-1 ring-zinc-500'
                                    : 'bg-zinc-900/80 text-zinc-500 ring-1 ring-zinc-800 hover:text-zinc-300'
                            }`}
                        >
                            {tag}
                        </button>
                    ))}
                </div>

                <div className="custom-scrollbar flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center px-6 py-12 text-center">
                            <Lightbulb className="mb-3 h-10 w-10 text-zinc-700" strokeWidth={1.25} aria-hidden />
                            {entries.length === 0 ? (
                                <>
                                    <p className="text-sm text-zinc-500">No entries yet.</p>
                                    <p className="mt-2 text-xs text-zinc-600">Use &quot;New entry&quot; above to open the editor.</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm text-zinc-500">No entries match this filter.</p>
                                    <button
                                        type="button"
                                        onClick={() => setFilterTag(null)}
                                        className="mt-3 text-xs font-medium text-zinc-400 underline-offset-2 hover:underline"
                                    >
                                        Clear filters
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        filtered.map((entry) => {
                            const selectEntry = () => {
                                setSelectedEntry(entry);
                                const empty = !entry.title?.trim() && !entry.content?.trim();
                                setIsEditing(empty);
                            };
                            return (
                                <div
                                    key={entry.id}
                                    className={`group relative flex w-full border-b border-zinc-800/80 ${
                                        selectedEntry?.id === entry.id
                                            ? 'bg-zinc-800/50 ring-1 ring-inset ring-zinc-600/50'
                                            : ''
                                    }`}
                                >
                                    {/* Sibling of delete — not inside role=button (avoids invalid nesting + hydration warnings) */}
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={selectEntry}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                selectEntry();
                                            }
                                        }}
                                        className={`min-w-0 flex-1 cursor-pointer py-4 pl-4 pr-14 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-500/50 ${
                                            selectedEntry?.id === entry.id ? 'pl-3' : 'hover:bg-zinc-800/40'
                                        }`}
                                    >
                                        <div className="mb-2 flex items-start justify-between gap-2">
                                            <span
                                                className={`rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                                                    MOOD_STYLES[entry.mood || 'neutral'] || MOOD_STYLES.neutral
                                                }`}
                                            >
                                                {entry.mood || 'neutral'}
                                            </span>
                                            <span className="shrink-0 text-[10px] text-zinc-600">
                                                {new Date(entry.timestamp).toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}
                                            </span>
                                        </div>
                                        <p className="font-serif text-[15px] font-medium leading-snug text-zinc-100 line-clamp-2">
                                            {entry.title || 'Untitled note'}
                                        </p>
                                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                                            {entry.content || '…'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => handleDeleteEntry(entry.id, e)}
                                        className="absolute right-2 top-2 z-10 rounded-lg p-1.5 text-zinc-600 opacity-0 transition hover:bg-zinc-800 hover:text-zinc-300 group-hover:opacity-100"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="mt-auto shrink-0 border-t border-zinc-800 p-3">
                    <p className="text-center text-[10px] leading-relaxed text-zinc-500">
                        Desk AI lives in the floating chat below — same as other desks.
                    </p>
                </div>
            </aside>

            {/* Editor — z-20 so nothing steals clicks from the textarea */}
            <main className="relative z-20 flex min-w-0 flex-1 flex-col bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900">
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.06]"
                    style={{
                        backgroundImage: `radial-gradient(circle at 20% 20%, rgba(113,113,122,0.12), transparent 45%), radial-gradient(circle at 80% 80%, rgba(82,82,91,0.1), transparent 40%)`,
                    }}
                />

                {selectedEntry ? (
                    <>
                        <header className="relative z-10 flex flex-col gap-4 border-b border-zinc-800 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
                            <div className="min-w-0 flex-1">
                                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
                                    Title
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={selectedEntry.title}
                                        onChange={(e) => setSelectedEntry({ ...selectedEntry, title: e.target.value })}
                                        className="w-full min-w-0 border-b border-transparent bg-transparent font-serif text-xl text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-zinc-500"
                                        placeholder="Entry title"
                                    />
                                ) : (
                                    <h1 className="font-serif text-2xl text-zinc-50">
                                        {selectedEntry.title || 'Untitled note'}
                                    </h1>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                {isEditing && (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Mood</span>
                                            <select
                                                value={selectedEntry.mood || 'neutral'}
                                                onChange={(e) =>
                                                    setSelectedEntry({
                                                        ...selectedEntry,
                                                        mood: e.target.value,
                                                    })
                                                }
                                                className="rounded-lg border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-500"
                                            >
                                                <option value="neutral">Neutral</option>
                                                <option value="positive">Optimistic</option>
                                                <option value="negative">Critical</option>
                                                <option value="alert">Alert</option>
                                            </select>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleSaveEntry}
                                            className="inline-flex items-center gap-2 rounded-xl border border-zinc-600 bg-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-100 shadow-md shadow-zinc-950/30 transition hover:border-zinc-500 hover:bg-zinc-600"
                                        >
                                            <Save className="h-3.5 w-3.5" aria-hidden />
                                            Save
                                        </button>
                                    </>
                                )}
                                {!isEditing && (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(true)}
                                        className="rounded-xl border border-zinc-600 px-4 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
                                    >
                                        Edit
                                    </button>
                                )}
                            </div>
                        </header>

                        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
                            <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6 sm:py-8">
                                {isEditing ? (
                                    <textarea
                                        value={selectedEntry.content}
                                        onChange={(e) => setSelectedEntry({ ...selectedEntry, content: e.target.value })}
                                        placeholder="Write freely. This space is for sense-making, not slogans."
                                        autoFocus
                                        rows={14}
                                        className="min-h-[min(70vh,560px)] w-full flex-1 resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-4 text-[15px] leading-[1.75] text-zinc-200 outline-none ring-0 transition placeholder:text-zinc-500 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/25"
                                    />
                                ) : (
                                    <article className="prose prose-invert prose-p:leading-[1.75] max-w-3xl">
                                        <p className="whitespace-pre-wrap text-[15px] leading-[1.75] text-zinc-300">
                                            {selectedEntry.content || (
                                                <span className="text-zinc-600">No body text yet.</span>
                                            )}
                                        </p>
                                    </article>
                                )}

                                {isEditing && (
                                    <div className="mt-8 flex flex-wrap gap-2 border-t border-zinc-800 pt-6">
                                        {['Strategic', 'Blocker', 'Insight', 'Personal', 'Finance'].map((tag) => (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => {
                                                    const has = selectedEntry.tags.includes(tag);
                                                    const newTags = has
                                                        ? selectedEntry.tags.filter((t) => t !== tag)
                                                        : [...selectedEntry.tags, tag];
                                                    setSelectedEntry({ ...selectedEntry, tags: newTags });
                                                }}
                                                className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
                                                    selectedEntry.tags.includes(tag)
                                                        ? 'bg-zinc-700 text-zinc-100 ring-1 ring-zinc-500'
                                                        : 'bg-zinc-900 text-zinc-500 ring-1 ring-zinc-800 hover:text-zinc-300'
                                                }`}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {!isEditing && (
                                <aside className="w-full shrink-0 border-t border-zinc-800 bg-zinc-900/50 px-5 py-6 lg:w-72 lg:border-l lg:border-t-0">
                                    <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                        <Sparkles className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
                                        Signal sketch
                                    </div>

                                    {simulatingAnalysis ? (
                                        <div className="flex flex-col items-center py-10 text-zinc-500">
                                            <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
                                            <span className="text-xs">Reading tone…</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="mb-4 rounded-xl border border-zinc-700 bg-zinc-800/60 p-4">
                                                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Energy</p>
                                                <p className="mt-1 font-serif text-2xl text-zinc-200">Steady</p>
                                                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                                                    <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-zinc-500 to-zinc-400" />
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-zinc-700 bg-zinc-800/40 p-4">
                                                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Echoes</p>
                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    {['Growth', 'Q3', 'Hiring'].map((ent) => (
                                                        <span
                                                            key={ent}
                                                            className="rounded-md bg-zinc-950 px-2 py-1 text-[10px] text-zinc-400 ring-1 ring-zinc-800"
                                                        >
                                                            {ent}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-zinc-600">
                                                <HeartPulse className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                                                Placeholder synthesis — wire your model to replace this block.
                                            </p>
                                        </>
                                    )}
                                </aside>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
                        <PenLine className="h-12 w-12 text-zinc-600" strokeWidth={1} aria-hidden />
                        <div>
                            <p className="font-serif text-xl text-zinc-200">Start your diary</p>
                            <p className="mt-2 max-w-md text-sm text-zinc-500">
                                Venture: <span className="text-zinc-300">{activeProject.name}</span>
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleCreateEntry}
                            className="rounded-xl border border-zinc-600 bg-zinc-700 px-8 py-3.5 text-sm font-semibold text-zinc-100 shadow-md shadow-zinc-950/30 transition hover:border-zinc-500 hover:bg-zinc-600"
                        >
                            Start writing
                        </button>
                        <p className="max-w-sm text-xs text-zinc-600">
                            Opens the editor immediately — title, body, then Save. You can also use <span className="text-zinc-400">New entry</span> in the left panel.
                        </p>
                    </div>
                )}
            </main>
            </div>
        </div>
    );
}
