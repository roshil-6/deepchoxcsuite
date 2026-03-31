'use client';

import React, { useState } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import {
    FileText,
    Loader2,
    Lock,
    BookOpen,
    Megaphone,
    Sparkles,
    ShieldCheck,
    ChevronDown,
    Save,
    Maximize2,
    Minimize2,
} from 'lucide-react';
import { ReportCeremony } from './ReportCeremony';
import { WorkspaceAiButton } from '@/components/workspace/WorkspaceAiButton';
import { EXEC_OUTPUT_ROLES } from '@/lib/execOutputFormats';

export function ReportsLibrary() {
    const { activeProject, updateProjectField } = useOffice();
    const [notes, setNotes] = useState(activeProject?.userNotes || '');
    const [directives, setDirectives] = useState(activeProject?.teamDirectives || '');
    const [isSaving, setIsSaving] = useState(false);
    const [savingJournal, setSavingJournal] = useState(false);
    const [savingDirectives, setSavingDirectives] = useState(false);
    const [showCeremony, setShowCeremony] = useState(false);
    const [lastSaved, setLastSaved] = useState<number | null>(null);
    const [lastSavedJournal, setLastSavedJournal] = useState<number | null>(null);
    const [lastSavedDirectives, setLastSavedDirectives] = useState<number | null>(null);
    const [expandedJournal, setExpandedJournal] = useState(true);
    const [expandedDirectives, setExpandedDirectives] = useState(true);
    /** Expanded writing: fills this panel (workspace column), not a separate black overlay */
    const [expandedWriter, setExpandedWriter] = useState<null | 'journal' | 'directives'>(null);

    React.useEffect(() => {
        setNotes(activeProject?.userNotes || '');
        setDirectives(activeProject?.teamDirectives || '');
    }, [activeProject]);

    React.useEffect(() => {
        if (!expandedWriter) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setExpandedWriter(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [expandedWriter]);

    const handleSaveAll = async () => {
        if (!activeProject) return;
        setIsSaving(true);
        try {
            await updateProjectField('userNotes', notes);
            await updateProjectField('teamDirectives', directives);
            const t = Date.now();
            setLastSaved(t);
            setLastSavedJournal(t);
            setLastSavedDirectives(t);
        } catch (error) {
            console.error('Failed to save journal data:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const saveJournalOnly = async () => {
        if (!activeProject) return;
        setSavingJournal(true);
        try {
            await updateProjectField('userNotes', notes);
            setLastSavedJournal(Date.now());
            setLastSaved(Date.now());
        } catch (error) {
            console.error('Failed to save journal:', error);
        } finally {
            setSavingJournal(false);
        }
    };

    const saveDirectivesOnly = async () => {
        if (!activeProject) return;
        setSavingDirectives(true);
        try {
            await updateProjectField('teamDirectives', directives);
            setLastSavedDirectives(Date.now());
            setLastSaved(Date.now());
        } catch (error) {
            console.error('Failed to save directives:', error);
        } finally {
            setSavingDirectives(false);
        }
    };

    const journalPreview = notes.trim().split('\n')[0]?.slice(0, 80) || 'Empty — add reflections…';
    const directivesPreview = directives.trim().split('\n')[0]?.slice(0, 80) || 'Empty — add broadcasts…';

    if (!activeProject)
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-zinc-900 p-12 text-zinc-500">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-zinc-600 bg-zinc-800 shadow-lg shadow-zinc-950/40">
                    <FileText className="h-8 w-8 text-zinc-400" aria-hidden />
                </div>
                <h2 className="font-serif text-xl text-zinc-200">Knowledge base</h2>
                <p className="max-w-sm text-center text-sm text-zinc-500">Select a venture to open journals and directives.</p>
            </div>
        );

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-zinc-900 animate-in fade-in duration-500">
            {showCeremony && <ReportCeremony onClose={() => setShowCeremony(false)} />}

            {expandedWriter ? (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-zinc-900">
                    <header className="shrink-0 border-b border-zinc-700 bg-zinc-800/90 px-4 py-3 sm:px-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setExpandedWriter(null)}
                                    className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700"
                                >
                                    <Minimize2 className="h-3.5 w-3.5" aria-hidden />
                                    Back
                                </button>
                                <div className="min-w-0">
                                    <h2 className="font-serif text-lg text-zinc-100">
                                        {expandedWriter === 'journal' ? 'Executive journal' : 'Team directives'}
                                    </h2>
                                    <p className="text-[11px] text-zinc-500">Expanded in this panel — Esc or Back to return.</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {expandedWriter === 'journal' ? (
                                    <button
                                        type="button"
                                        onClick={() => void saveJournalOnly()}
                                        disabled={savingJournal}
                                        className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50"
                                    >
                                        {savingJournal ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                                        ) : (
                                            <Save className="h-3.5 w-3.5" aria-hidden />
                                        )}
                                        Save
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => void saveDirectivesOnly()}
                                        disabled={savingDirectives}
                                        className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50"
                                    >
                                        {savingDirectives ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                                        ) : (
                                            <Save className="h-3.5 w-3.5" aria-hidden />
                                        )}
                                        Save
                                    </button>
                                )}
                            </div>
                        </div>
                    </header>
                    <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-3 sm:px-6">
                        <textarea
                            value={expandedWriter === 'journal' ? notes : directives}
                            onChange={(e) =>
                                expandedWriter === 'journal'
                                    ? setNotes(e.target.value)
                                    : setDirectives(e.target.value)
                            }
                            placeholder={
                                expandedWriter === 'journal'
                                    ? 'Observations, risks, wins…'
                                    : 'Company-wide priorities, shifts, non-negotiables…'
                            }
                            autoFocus
                            spellCheck
                            className="min-h-0 flex-1 w-full resize-none rounded-xl border-2 border-zinc-700 bg-zinc-900 px-4 py-4 text-[15px] leading-[1.75] text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/25 sm:text-base"
                        />
                    </div>
                </div>
            ) : (
                <>
            <header className="relative z-10 shrink-0 border-b border-zinc-700 bg-zinc-800/90 px-6 py-6 sm:px-10">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="min-w-0 max-w-2xl">
                        <div className="mb-2 flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 text-zinc-300">
                                <BookOpen className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                                <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">Knowledge base</span>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-600 bg-zinc-800 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                                Stored on device
                            </span>
                        </div>
                        <h1 className="font-serif text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">Intelligence vault</h1>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
                            Private to this venture. Open each vault, edit, and save — or use{' '}
                            <span className="text-zinc-300">Expand</span> so the editor fills this workspace panel for focused writing.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <WorkspaceAiButton label="Dexo" />
                        <button
                            type="button"
                            onClick={handleSaveAll}
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-5 py-2.5 text-xs font-semibold text-zinc-100 shadow-md shadow-zinc-950/30 transition hover:border-zinc-500 hover:bg-zinc-700 disabled:opacity-60"
                        >
                            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <FileText className="h-3.5 w-3.5" aria-hidden />}
                            {isSaving ? 'Saving…' : 'Save all'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowCeremony(true)}
                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-700 px-5 py-2.5 text-xs font-semibold text-zinc-100 shadow-md shadow-zinc-950/25 transition hover:border-zinc-500 hover:bg-zinc-600"
                        >
                            <Lock className="h-3.5 w-3.5" aria-hidden />
                            Finalize blueprint
                        </button>
                    </div>
                </div>
                {lastSaved ? (
                    <p className="mt-4 text-[11px] text-zinc-500">Last saved (any) {new Date(lastSaved).toLocaleString()}</p>
                ) : (
                    <p className="mt-4 text-[11px] text-zinc-600">Use Save on each box or Save all in the header.</p>
                )}
            </header>

            <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-8 sm:px-10 sm:py-10">
                <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2 lg:gap-10">
                    {/* Executive journal */}
                    <section className="flex flex-col overflow-hidden rounded-xl border border-zinc-600 bg-zinc-800/80 shadow-lg shadow-zinc-950/30">
                        <div className="flex items-stretch gap-0 border-b border-zinc-700 bg-zinc-800/95">
                            <button
                                type="button"
                                onClick={() => setExpandedJournal((e) => !e)}
                                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4 text-left transition hover:bg-zinc-800/80 sm:px-5"
                                aria-expanded={expandedJournal}
                            >
                                <ChevronDown
                                    className={`h-5 w-5 shrink-0 text-zinc-500 transition-transform duration-200 ${expandedJournal ? 'rotate-0' : '-rotate-90'}`}
                                    aria-hidden
                                />
                                <div className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-300">
                                        <BookOpen className="h-4 w-4 text-zinc-400" aria-hidden />
                                        Executive journal
                                    </span>
                                    {!expandedJournal && (
                                        <p className="mt-1 truncate text-xs text-zinc-500">{journalPreview}</p>
                                    )}
                                    {expandedJournal && (
                                        <p className="mt-1 text-xs text-zinc-500">Founder reflections — anchored to this venture.</p>
                                    )}
                                </div>
                            </button>
                            <div className="flex shrink-0 flex-col justify-center border-l border-zinc-700 px-2 py-2">
                                <button
                                    type="button"
                                    onClick={saveJournalOnly}
                                    disabled={savingJournal}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-[11px] font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700 disabled:opacity-50"
                                >
                                    {savingJournal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" aria-hidden />}
                                    Save
                                </button>
                                {lastSavedJournal && (
                                    <span className="mt-1 max-w-[5.5rem] text-center text-[9px] leading-tight text-zinc-600">
                                        {new Date(lastSavedJournal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setExpandedJournal(true);
                                        setExpandedWriter('journal');
                                    }}
                                    className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-zinc-600 bg-zinc-900/80 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
                                    title="Expand editor to fill this panel"
                                >
                                    <Maximize2 className="h-3 w-3 shrink-0" aria-hidden />
                                    <span className="truncate">Expand</span>
                                </button>
                            </div>
                        </div>
                        {expandedJournal && (
                            <div className="p-5">
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Observations, risks, wins…"
                                    className="min-h-[14rem] w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/25"
                                />
                            </div>
                        )}
                    </section>

                    {/* Team directives */}
                    <section className="flex flex-col overflow-hidden rounded-xl border border-zinc-600 bg-zinc-800/80 shadow-lg shadow-zinc-950/30">
                        <div className="flex items-stretch gap-0 border-b border-zinc-700 bg-zinc-800/95">
                            <button
                                type="button"
                                onClick={() => setExpandedDirectives((e) => !e)}
                                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4 text-left transition hover:bg-zinc-800/80 sm:px-5"
                                aria-expanded={expandedDirectives}
                            >
                                <ChevronDown
                                    className={`h-5 w-5 shrink-0 text-zinc-500 transition-transform duration-200 ${expandedDirectives ? 'rotate-0' : '-rotate-90'}`}
                                    aria-hidden
                                />
                                <div className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-300">
                                        <Megaphone className="h-4 w-4 text-zinc-400" aria-hidden />
                                        Team directives
                                    </span>
                                    {!expandedDirectives && (
                                        <p className="mt-1 truncate text-xs text-zinc-500">{directivesPreview}</p>
                                    )}
                                    {expandedDirectives && (
                                        <p className="mt-1 text-xs text-zinc-500">Broadcast once — agents read this in full context.</p>
                                    )}
                                </div>
                            </button>
                            <div className="flex shrink-0 flex-col justify-center border-l border-zinc-700 px-2 py-2">
                                <button
                                    type="button"
                                    onClick={saveDirectivesOnly}
                                    disabled={savingDirectives}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-[11px] font-semibold text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700 disabled:opacity-50"
                                >
                                    {savingDirectives ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" aria-hidden />}
                                    Save
                                </button>
                                {lastSavedDirectives && (
                                    <span className="mt-1 max-w-[5.5rem] text-center text-[9px] leading-tight text-zinc-600">
                                        {new Date(lastSavedDirectives).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setExpandedDirectives(true);
                                        setExpandedWriter('directives');
                                    }}
                                    className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-zinc-600 bg-zinc-900/80 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
                                    title="Expand editor to fill this panel"
                                >
                                    <Maximize2 className="h-3 w-3 shrink-0" aria-hidden />
                                    <span className="truncate">Expand</span>
                                </button>
                            </div>
                        </div>
                        {expandedDirectives && (
                            <div className="p-5">
                                <textarea
                                    value={directives}
                                    onChange={(e) => setDirectives(e.target.value)}
                                    placeholder="Company-wide priorities, shifts, non-negotiables…"
                                    className="min-h-[14rem] w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/25"
                                />
                            </div>
                        )}
                    </section>
                </div>

                <section className="mx-auto mt-12 max-w-6xl">
                    <div className="mb-5 flex items-center gap-2 border-b border-zinc-700 pb-4">
                        <Sparkles className="h-4 w-4 text-zinc-400" aria-hidden />
                        <h2 className="font-serif text-lg text-zinc-200">Exports</h2>
                    </div>

                    <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {EXEC_OUTPUT_ROLES.map((r) => (
                            <div
                                key={r.id}
                                className="rounded-xl border border-zinc-600/80 bg-zinc-800/50 px-4 py-3 shadow-inner shadow-zinc-950/20"
                            >
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-300">{r.shortTitle}</span>
                                    <span className="shrink-0 rounded border border-zinc-600 bg-zinc-900/80 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
                                        Exec output
                                    </span>
                                </div>
                                <p className="mt-1.5 font-serif text-sm font-semibold text-zinc-100">{r.execOutput}</p>
                                <p className="mt-1 text-[11px] leading-snug text-zinc-500">{r.description}</p>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowCeremony(true)}
                        className="group flex w-full max-w-md flex-col gap-3 rounded-xl border border-zinc-600 bg-zinc-800/80 p-8 text-left shadow-lg shadow-zinc-950/30 transition hover:border-zinc-500 hover:bg-zinc-800"
                    >
                        <FileText className="h-8 w-8 text-zinc-400 transition group-hover:text-zinc-200" aria-hidden />
                        <span className="font-serif text-xl text-zinc-100">Executive strategy blueprint</span>
                        <span className="text-sm text-zinc-500">Vision, roadmap, budget, market — one consolidated artifact.</span>
                        <span className="mt-2 inline-flex w-fit rounded-full border border-zinc-600 bg-zinc-800 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                            Ready
                        </span>
                    </button>
                </section>
            </div>
                </>
            )}
        </div>
    );
}
