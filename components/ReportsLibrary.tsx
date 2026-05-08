'use client';

import React, { useState } from 'react';
import { useOffice } from '@/lib/OfficeContext';
import {
    FileText,
    Loader2,
    Lock,
    BookOpen,
    Megaphone,
    ShieldCheck,
    ChevronDown,
    Save,
    Maximize2,
    Minimize2,
} from 'lucide-react';
import { ReportCeremony } from './ReportCeremony';
import { WorkspaceAiButton } from '@/components/workspace/WorkspaceAiButton';
import { EXEC_OUTPUT_ROLES } from '@/lib/execOutputFormats';
import { EmptyStateGuide } from '@/components/ui/ContextualGuide';

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
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-brand-bg p-12 text-brand-muted">
                <EmptyStateGuide
                    icon={<FileText className="h-7 w-7" aria-hidden />}
                    title="Knowledge base"
                    description="Select a venture to open journals, directives, and private working notes."
                    className="max-w-md"
                />
            </div>
        );

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-brand-bg animate-in fade-in duration-500">
            {showCeremony && <ReportCeremony onClose={() => setShowCeremony(false)} />}

            {expandedWriter ? (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-brand-bg">
                    <header className="shrink-0 border-b border-white/[0.06] bg-brand-bg px-4 py-3 sm:px-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setExpandedWriter(null)}
                                    className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.05] px-3 py-2 text-xs font-medium text-brand-text transition hover:bg-white/[0.08]"
                                >
                                    <Minimize2 className="h-3.5 w-3.5" aria-hidden />
                                    Back
                                </button>
                                <div className="min-w-0">
                                    <h2 className="text-base font-medium text-brand-text">
                                        {expandedWriter === 'journal' ? 'Executive journal' : 'Team directives'}
                                    </h2>
                                    <p className="text-[11px] text-brand-muted">Esc or Back to return.</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {expandedWriter === 'journal' ? (
                                    <button
                                        type="button"
                                        onClick={() => void saveJournalOnly()}
                                        disabled={savingJournal}
                                        className="inline-flex items-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.05] px-4 py-2 text-xs font-medium text-brand-text transition hover:bg-white/[0.08] disabled:opacity-50"
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
                                        className="inline-flex items-center gap-2 rounded-lg border border-white/[0.1] bg-white/[0.05] px-4 py-2 text-xs font-medium text-brand-text transition hover:bg-white/[0.08] disabled:opacity-50"
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
                    <div className="relative min-h-0 flex-1 px-4 pb-4 pt-3 sm:px-6">
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
                            className="absolute inset-x-4 inset-y-3 resize-none rounded-xl border border-white/[0.1] bg-brand-bg px-4 py-4 text-[15px] leading-[1.75] text-brand-text placeholder:text-brand-muted outline-none transition focus:border-white/[0.2] focus:ring-1 focus:ring-white/10 sm:inset-x-6 sm:text-base custom-scrollbar"
                        />
                    </div>
                </div>
            ) : (
                <>
            <header className="relative z-10 shrink-0 border-b border-white/[0.06] bg-transparent px-0 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 max-w-2xl">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1.5 text-brand-muted">
                                <BookOpen className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                                <span className="text-[12px] font-medium">Knowledge base</span>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-brand-muted">
                                <ShieldCheck className="h-3 w-3" aria-hidden />
                                On device
                            </span>
                        </div>
                        <h1 className="text-lg font-semibold tracking-tight text-brand-text sm:text-xl">Intelligence vault</h1>
                        <p className="mt-1 max-w-xl text-[13px] leading-snug text-brand-muted">
                            Journals below — <span className="text-brand-text/90">Expand</span> for full panel, or Save all.
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
                        <WorkspaceAiButton label="Deepchox" className="border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-brand-text hover:bg-white/[0.08]" />
                        <button
                            type="button"
                            onClick={handleSaveAll}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-brand-text transition hover:bg-white/[0.08] disabled:opacity-60"
                        >
                            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <FileText className="h-3.5 w-3.5" aria-hidden />}
                            {isSaving ? 'Saving…' : 'Save all'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowCeremony(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-brand-text transition hover:bg-white/[0.08]"
                        >
                            <Lock className="h-3.5 w-3.5" aria-hidden />
                            Finalize blueprint
                        </button>
                    </div>
                </div>
                {lastSaved ? (
                    <p className="mt-2 text-[10px] text-brand-muted">Saved {new Date(lastSaved).toLocaleString()}</p>
                ) : (
                    <p className="mt-2 text-[10px] text-brand-muted">Save per box or Save all.</p>
                )}
            </header>

            <div className="custom-scrollbar flex-1 overflow-y-auto px-0 py-3 sm:py-4">
                <div className="mx-auto grid max-w-5xl gap-3 lg:grid-cols-2 lg:gap-4">
                    {/* Executive journal */}
                    <section className="flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
                        <div className="flex items-stretch gap-0 border-b border-white/[0.06] bg-transparent">
                            <button
                                type="button"
                                onClick={() => setExpandedJournal((e) => !e)}
                                className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left transition hover:bg-white/[0.03] sm:px-4"
                                aria-expanded={expandedJournal}
                            >
                                <ChevronDown
                                    className={`h-4 w-4 shrink-0 text-brand-muted transition-transform duration-200 ${expandedJournal ? 'rotate-0' : '-rotate-90'}`}
                                    aria-hidden
                                />
                                <div className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1.5 text-[12px] font-medium text-brand-text">
                                        <BookOpen className="h-3.5 w-3.5 text-brand-muted" aria-hidden />
                                        Executive journal
                                    </span>
                                    {!expandedJournal && (
                                        <p className="mt-0.5 truncate text-[11px] text-brand-muted">{journalPreview}</p>
                                    )}
                                    {expandedJournal && (
                                        <p className="mt-0.5 text-[11px] text-brand-muted">Reflections for this venture.</p>
                                    )}
                                </div>
                            </button>
                            <div className="flex shrink-0 flex-col justify-center border-l border-white/[0.06] px-1.5 py-1.5">
                                <button
                                    type="button"
                                    onClick={saveJournalOnly}
                                    disabled={savingJournal}
                                    className="inline-flex items-center gap-1 rounded-md border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-[11px] font-medium text-brand-text transition hover:bg-white/[0.08] disabled:opacity-50"
                                >
                                    {savingJournal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" aria-hidden />}
                                    Save
                                </button>
                                {lastSavedJournal && (
                                    <span className="mt-0.5 max-w-[5.5rem] text-center text-[9px] leading-tight text-brand-muted">
                                        {new Date(lastSavedJournal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setExpandedJournal(true);
                                        setExpandedWriter('journal');
                                    }}
                                    className="mt-1.5 inline-flex w-full items-center justify-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-brand-muted transition hover:bg-white/[0.08] hover:text-brand-text"
                                    title="Expand editor to fill this panel"
                                >
                                    <Maximize2 className="h-3 w-3 shrink-0" aria-hidden />
                                    <span className="truncate">Expand</span>
                                </button>
                            </div>
                        </div>
                        {expandedJournal && (
                            <div className="p-3 sm:p-4">
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Observations, risks, wins…"
                                    className="min-h-[10rem] w-full resize-y rounded-lg border border-white/[0.08] bg-brand-bg px-3 py-2.5 text-[13px] leading-relaxed text-brand-text placeholder:text-brand-muted outline-none transition focus:border-white/[0.15] focus:ring-1 focus:ring-white/10"
                                />
                            </div>
                        )}
                    </section>

                    {/* Team directives */}
                    <section className="flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
                        <div className="flex items-stretch gap-0 border-b border-white/[0.06] bg-transparent">
                            <button
                                type="button"
                                onClick={() => setExpandedDirectives((e) => !e)}
                                className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left transition hover:bg-white/[0.03] sm:px-4"
                                aria-expanded={expandedDirectives}
                            >
                                <ChevronDown
                                    className={`h-4 w-4 shrink-0 text-brand-muted transition-transform duration-200 ${expandedDirectives ? 'rotate-0' : '-rotate-90'}`}
                                    aria-hidden
                                />
                                <div className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1.5 text-[12px] font-medium text-brand-text">
                                        <Megaphone className="h-3.5 w-3.5 text-brand-muted" aria-hidden />
                                        Team directives
                                    </span>
                                    {!expandedDirectives && (
                                        <p className="mt-0.5 truncate text-[11px] text-brand-muted">{directivesPreview}</p>
                                    )}
                                    {expandedDirectives && (
                                        <p className="mt-0.5 text-[11px] text-brand-muted">Agents use this as full context.</p>
                                    )}
                                </div>
                            </button>
                            <div className="flex shrink-0 flex-col justify-center border-l border-white/[0.06] px-1.5 py-1.5">
                                <button
                                    type="button"
                                    onClick={saveDirectivesOnly}
                                    disabled={savingDirectives}
                                    className="inline-flex items-center gap-1 rounded-md border border-white/[0.1] bg-white/[0.04] px-2 py-1.5 text-[11px] font-medium text-brand-text transition hover:bg-white/[0.08] disabled:opacity-50"
                                >
                                    {savingDirectives ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" aria-hidden />}
                                    Save
                                </button>
                                {lastSavedDirectives && (
                                    <span className="mt-0.5 max-w-[5.5rem] text-center text-[9px] leading-tight text-brand-muted">
                                        {new Date(lastSavedDirectives).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setExpandedDirectives(true);
                                        setExpandedWriter('directives');
                                    }}
                                    className="mt-1.5 inline-flex w-full items-center justify-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-brand-muted transition hover:bg-white/[0.08] hover:text-brand-text"
                                    title="Expand editor to fill this panel"
                                >
                                    <Maximize2 className="h-3 w-3 shrink-0" aria-hidden />
                                    <span className="truncate">Expand</span>
                                </button>
                            </div>
                        </div>
                        {expandedDirectives && (
                            <div className="p-3 sm:p-4">
                                <textarea
                                    value={directives}
                                    onChange={(e) => setDirectives(e.target.value)}
                                    placeholder="Company-wide priorities, shifts, non-negotiables…"
                                    className="min-h-[10rem] w-full resize-y rounded-lg border border-white/[0.08] bg-brand-bg px-3 py-2.5 text-[13px] leading-relaxed text-brand-text placeholder:text-brand-muted outline-none transition focus:border-white/[0.15] focus:ring-1 focus:ring-white/10"
                                />
                            </div>
                        )}
                    </section>
                </div>

                <section className="mx-auto mt-6 max-w-5xl pb-4">
                    <h2 className="mb-2 text-[12px] font-medium text-brand-muted">Exports</h2>
                    <p className="mb-3 text-[11px] leading-snug text-brand-muted/90">
                        What each desk is meant to produce — reference only.
                    </p>

                    <div className="overflow-hidden rounded-xl border border-white/[0.06]">
                        <ul className="divide-y divide-white/[0.06]">
                            {EXEC_OUTPUT_ROLES.map((r) => (
                                <li key={r.id} className="flex gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
                                    <span className="w-9 shrink-0 pt-0.5 text-[11px] font-medium tabular-nums text-brand-muted">
                                        {r.shortTitle}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[13px] font-medium leading-snug text-brand-text">{r.execOutput}</p>
                                        <p className="mt-0.5 text-[11px] leading-snug text-brand-muted">{r.description}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <button
                            type="button"
                            onClick={() => setShowCeremony(true)}
                            className="group flex w-full items-center gap-3 border-t border-white/[0.06] bg-white/[0.03] px-3 py-3 text-left transition hover:bg-white/[0.06] sm:px-4 sm:py-3.5"
                        >
                            <FileText className="h-4 w-4 shrink-0 text-brand-muted group-hover:text-brand-text" aria-hidden />
                            <div className="min-w-0 flex-1">
                                <span className="block text-[13px] font-medium text-brand-text">Executive strategy blueprint</span>
                                <span className="mt-0.5 block text-[11px] text-brand-muted">Vision, roadmap, budget, market — one doc.</span>
                            </div>
                            <span className="shrink-0 rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-medium text-brand-muted group-hover:text-brand-text">
                                Open
                            </span>
                        </button>
                    </div>
                </section>
            </div>
                </>
            )}
        </div>
    );
}
