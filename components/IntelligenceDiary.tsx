'use client';

import React, { useState, useEffect, useRef } from 'react';
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
    Mic,
    MicOff,
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
    positive: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    negative: 'bg-rose-500/10 text-rose-300 border-rose-500/25',
    alert: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    neutral: 'bg-white/[0.06] text-zinc-400 border-white/[0.1]',
};

export function IntelligenceDiary() {
    const { activeProject, updateProjectField } = useOffice();
    const [entries, setEntries] = useState<DiaryEntry[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [filterTag, setFilterTag] = useState<string | null>(null);
    const [simulatingAnalysis, setSimulatingAnalysis] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

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

    const toggleVoice = () => {
        if (!selectedEntry) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) {
            alert('Voice input is not supported in this browser.');
            return;
        }
        if (isRecording && recognitionRef.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (recognitionRef.current as any).stop();
            return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rec: any = new SR();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = 'en-US';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onresult = (event: any) => {
            const transcript = Array.from(event.results as any[])
                .slice(event.resultIndex)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((r: any) => r[0].transcript)
                .join(' ');
            setSelectedEntry((prev) =>
                prev ? { ...prev, content: prev.content ? prev.content + ' ' + transcript : transcript } : prev,
            );
        };
        rec.onerror = () => { setIsRecording(false); };
        rec.onend = () => { setIsRecording(false); };
        recognitionRef.current = rec;
        rec.start();
        setIsRecording(true);
    };

    if (!activeProject) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-brand-bg p-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
                    <PenLine className="h-7 w-7 text-zinc-400" strokeWidth={1.5} />
                </div>
                <h2 className="text-lg font-semibold text-zinc-100">Neural Diary</h2>
                <p className="max-w-sm text-[13px] leading-relaxed text-zinc-500">
                    Select or create a venture to capture private signals, reflections, and strategic notes.
                </p>
            </div>
        );
    }

    const filtered = entries.filter((e) => !filterTag || e.tags.includes(filterTag));

    return (
        <div className="relative flex h-full min-h-0 w-full overflow-hidden text-zinc-200">
            <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            <aside className="flex h-full min-h-0 w-[min(100%,300px)] shrink-0 flex-col border-r border-white/[0.06] bg-brand-bg">
                <div className="border-b border-white/[0.06] px-4 py-4">
                    <div className="flex items-center gap-2">
                        <Bookmark className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.75} aria-hidden />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Neural diary</span>
                    </div>
                    <p className="mt-1.5 text-[12px] leading-snug text-zinc-400">
                        Reflections &amp; signals for this venture.
                    </p>
                    <button
                        type="button"
                        onClick={handleCreateEntry}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] py-2 text-[11px] font-semibold text-zinc-200 transition hover:bg-white/[0.08]"
                    >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                        New entry
                    </button>
                </div>

                <div className="flex gap-1.5 overflow-x-auto border-b border-white/[0.06] px-3 py-2.5">
                    {['Strategic', 'Blocker', 'Insight', 'Personal'].map((tag) => (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                            className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-medium transition ${
                                filterTag === tag
                                    ? 'bg-white/[0.1] text-zinc-100'
                                    : 'bg-white/[0.03] text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            {tag}
                        </button>
                    ))}
                </div>

                <div className="custom-scrollbar flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center px-6 py-12 text-center">
                            <Lightbulb className="mb-3 h-8 w-8 text-zinc-700" strokeWidth={1.25} aria-hidden />
                            {entries.length === 0 ? (
                                <>
                                    <p className="text-[13px] text-zinc-500">No entries yet.</p>
                                    <p className="mt-1.5 text-[11px] text-zinc-600">Use &quot;New entry&quot; above.</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-[13px] text-zinc-500">No entries match this filter.</p>
                                    <button
                                        type="button"
                                        onClick={() => setFilterTag(null)}
                                        className="mt-2 text-[11px] font-medium text-zinc-400 underline-offset-2 hover:underline"
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
                                    className={`group relative flex w-full border-b border-white/[0.04] ${
                                        selectedEntry?.id === entry.id
                                            ? 'bg-white/[0.06]'
                                            : ''
                                    }`}
                                >
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
                                        className={`min-w-0 flex-1 cursor-pointer px-4 py-3 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/20 ${
                                            selectedEntry?.id === entry.id ? '' : 'hover:bg-white/[0.03]'
                                        }`}
                                    >
                                        <div className="mb-1.5 flex items-center justify-between gap-2">
                                            <span
                                                className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
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
                                        <p className="text-[13px] font-medium leading-snug text-zinc-100 line-clamp-2">
                                            {entry.title || 'Untitled note'}
                                        </p>
                                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">
                                            {entry.content || '…'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => handleDeleteEntry(entry.id, e)}
                                        className="absolute right-2 top-2 z-10 rounded-lg p-1.5 text-zinc-600 opacity-0 transition hover:bg-white/[0.08] hover:text-zinc-300 group-hover:opacity-100"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </aside>

            <main className="relative flex min-w-0 flex-1 flex-col bg-brand-bg">
                {selectedEntry ? (
                    <>
                        <header className="flex flex-col gap-3 border-b border-white/[0.06] px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
                            <div className="min-w-0 flex-1">
                                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                                    Title
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={selectedEntry.title}
                                        onChange={(e) => setSelectedEntry({ ...selectedEntry, title: e.target.value })}
                                        className="w-full min-w-0 border-b border-transparent bg-transparent text-[16px] font-semibold text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-white/[0.15]"
                                        placeholder="Entry title"
                                    />
                                ) : (
                                    <h1 className="text-[16px] font-semibold text-zinc-100">
                                        {selectedEntry.title || 'Untitled note'}
                                    </h1>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5">
                                {isEditing && (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Mood</span>
                                            <div className="flex gap-1">
                                                {(['neutral', 'positive', 'negative', 'alert'] as const).map((m) => (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => setSelectedEntry({ ...selectedEntry, mood: m })}
                                                        className={`rounded-lg border px-2 py-1 text-[10px] font-medium capitalize transition ${
                                                            selectedEntry.mood === m
                                                                ? MOOD_STYLES[m]
                                                                : 'border-white/[0.06] bg-white/[0.03] text-zinc-500 hover:text-zinc-300'
                                                        }`}
                                                    >
                                                        {m === 'positive' ? 'Optimistic' : m === 'negative' ? 'Critical' : m}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleSaveEntry}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-semibold text-zinc-100 transition hover:bg-white/[0.1]"
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
                                        className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:bg-white/[0.08]"
                                    >
                                        Edit
                                    </button>
                                )}
                            </div>
                        </header>

                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
                            <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
                                {isEditing ? (
                                    <div className="relative">
                                        <textarea
                                            value={selectedEntry.content}
                                            onChange={(e) => setSelectedEntry({ ...selectedEntry, content: e.target.value })}
                                            placeholder="Write freely — reflections, signals, strategic notes."
                                            autoFocus
                                            rows={14}
                                            className="min-h-[min(65vh,500px)] w-full flex-1 resize-y rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-4 pb-12 text-[14px] leading-[1.75] text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-white/[0.15]"
                                        />
                                        <button
                                            type="button"
                                            onClick={toggleVoice}
                                            title={isRecording ? 'Stop recording' : 'Voice input'}
                                            className={`absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition ${
                                                isRecording
                                                    ? 'animate-pulse border-rose-500/40 bg-rose-500/10 text-rose-400'
                                                    : 'border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08]'
                                            }`}
                                        >
                                            {isRecording ? (
                                                <MicOff className="h-3.5 w-3.5" aria-hidden />
                                            ) : (
                                                <Mic className="h-3.5 w-3.5" aria-hidden />
                                            )}
                                            {isRecording ? 'Stop' : 'Voice'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="max-w-3xl">
                                        <p className="whitespace-pre-wrap text-[14px] leading-[1.75] text-zinc-300">
                                            {selectedEntry.content || (
                                                <span className="text-zinc-600">No body text yet.</span>
                                            )}
                                        </p>
                                    </div>
                                )}

                                {isEditing && (
                                    <div className="mt-6 flex flex-wrap gap-1.5 border-t border-white/[0.06] pt-4">
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
                                                className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition ${
                                                    selectedEntry.tags.includes(tag)
                                                        ? 'bg-white/[0.1] text-zinc-100'
                                                        : 'bg-white/[0.03] text-zinc-500 hover:text-zinc-300'
                                                }`}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {!isEditing && (
                                <aside className="w-full shrink-0 border-t border-white/[0.06] bg-white/[0.02] px-5 py-5 lg:w-64 lg:border-l lg:border-t-0">
                                    <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                                        <Sparkles className="h-3.5 w-3.5 text-brand-teal" aria-hidden />
                                        Signal sketch
                                    </div>

                                    {simulatingAnalysis ? (
                                        <div className="flex flex-col items-center py-8 text-zinc-500">
                                            <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
                                            <span className="text-[11px]">Reading tone…</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="mb-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5">
                                                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Energy</p>
                                                <p className="mt-1 text-[18px] font-semibold text-zinc-200">Steady</p>
                                                <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                                                    <div className="h-full w-[72%] rounded-full bg-brand-teal/60" />
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3.5">
                                                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Echoes</p>
                                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                                    {['Growth', 'Q3', 'Hiring'].map((ent) => (
                                                        <span
                                                            key={ent}
                                                            className="rounded-lg bg-white/[0.04] px-2 py-1 text-[10px] text-zinc-400"
                                                        >
                                                            {ent}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-zinc-600">
                                                <HeartPulse className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
                                                Placeholder — wire your model to replace this.
                                            </p>
                                        </>
                                    )}
                                </aside>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
                        <PenLine className="h-10 w-10 text-zinc-600" strokeWidth={1.25} aria-hidden />
                        <div>
                            <p className="text-[15px] font-semibold text-zinc-200">Start your diary</p>
                            <p className="mt-1.5 text-[12px] text-zinc-500">
                                Venture: <span className="text-zinc-300">{activeProject.name}</span>
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleCreateEntry}
                            className="rounded-lg border border-white/[0.1] bg-white/[0.06] px-6 py-2.5 text-[12px] font-semibold text-zinc-100 transition hover:bg-white/[0.1]"
                        >
                            Start writing
                        </button>
                    </div>
                )}
            </main>
            </div>
        </div>
    );
}
