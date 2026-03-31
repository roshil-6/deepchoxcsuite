'use client';

import React, { useState, useEffect } from 'react';
import { Search, ExternalLink, Loader2, Globe, Users, Activity, Target, Save, BookOpen, Rss } from 'lucide-react';
import { useOffice } from '@/lib/OfficeContext';

export function ScoutTerminal() {
    const { activeProject, updateMarketInsights } = useOffice();
    const [tab, setTab] = useState<'feed' | 'brief'>('feed');
    const [newsItems, setNewsItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [brief, setBrief] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setBrief(activeProject?.marketInsights || '');
    }, [activeProject?.marketInsights]);

    useEffect(() => {
        if (activeProject?.name) {
            fetchIntel(`${activeProject.name} market trends`);
        } else {
            fetchIntel('Business market trends');
        }
    }, [activeProject?.name]);

    const fetchIntel = async (query: string) => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/intel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });
            const data = await res.json();
            if (data.items) setNewsItems(data.items);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearchKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') fetchIntel(searchQuery || 'market intelligence');
    };

    const saveBrief = () => {
        setSaving(true);
        updateMarketInsights(brief);
        setTimeout(() => setSaving(false), 500);
    };

    if (!activeProject) {
        return (
            <div className="flex h-full items-center justify-center p-8 text-sm text-zinc-500">
                Select a venture to open the CSO desk.
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-brand-bg">
            <header className="shrink-0 border-b border-zinc-700 px-6 py-5 sm:px-8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">CSO · Competitive map + threat level</p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">Chief Strategy Officer</h1>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-500">
                    Landscape of players and assessed risk to our position. Monitor signals in the feed, then capture conclusions and
                    competitor notes in the brief—shared context for strategy and product.
                </p>
                <nav className="mt-6 flex flex-wrap gap-2 border-t border-zinc-800 pt-4">
                    <button
                        type="button"
                        onClick={() => setTab('feed')}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                            tab === 'feed'
                                ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
                                : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                        }`}
                    >
                        <Rss className="h-4 w-4" aria-hidden />
                        News feed
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab('brief')}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
                            tab === 'brief'
                                ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
                                : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                        }`}
                    >
                        <BookOpen className="h-4 w-4" aria-hidden />
                        Intelligence brief
                    </button>
                </nav>
            </header>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
                {tab === 'feed' && (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
                                <MetricMini icon={<Globe className="h-4 w-4 text-zinc-400" />} label="Market lens" hint="Define in brief" />
                                <MetricMini icon={<Users className="h-4 w-4 text-zinc-400" />} label="Competition" hint="Name rivals" />
                                <MetricMini icon={<Activity className="h-4 w-4 text-zinc-400" />} label="Momentum" hint="Trends" />
                                <MetricMini icon={<Target className="h-4 w-4 text-zinc-400" />} label="Opportunity" hint="Gaps" />
                            </div>
                            <div className="relative w-full lg:w-80">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                                <input
                                    className="w-full rounded-lg border border-zinc-600 bg-zinc-900 py-2.5 pl-10 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                                    placeholder="Search headlines…"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleSearchKey}
                                />
                            </div>
                        </div>

                        <div>
                            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Headlines</h3>
                            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                                {isLoading ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-zinc-600" />
                                    </div>
                                ) : newsItems.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-zinc-600">No items returned. Adjust the search query.</p>
                                ) : (
                                    newsItems.map((item, i) => (
                                        <a
                                            key={i}
                                            href={item.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex gap-3 rounded-lg border border-zinc-700 bg-zinc-900 p-4 transition hover:border-zinc-600"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-sm font-medium leading-snug text-zinc-200">{item.title}</h4>
                                                <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-zinc-500">
                                                    <span>{item.source || 'Source'}</span>
                                                    <span>·</span>
                                                    <span>{item.time || ''}</span>
                                                </div>
                                            </div>
                                            <ExternalLink className="h-4 w-4 shrink-0 text-zinc-600" aria-hidden />
                                        </a>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'brief' && (
                    <section className="mx-auto max-w-4xl space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-semibold text-zinc-300">Intelligence brief</h2>
                                <p className="text-xs text-zinc-500">
                                    Synthesis for the suite: positioning, competitors, regulatory or macro risks, and open questions.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={saveBrief}
                                className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
                            >
                                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Save className="h-3.5 w-3.5" aria-hidden />}
                                Save brief
                            </button>
                        </div>
                        <textarea
                            value={brief}
                            onChange={(e) => setBrief(e.target.value)}
                            placeholder={`• Segment & ICP\n• Top competitors and differentiation\n• Risks and unknowns\n• Signals to watch\n`}
                            rows={22}
                            className="w-full rounded-lg border border-brand-border bg-brand-input p-4 text-[15px] leading-relaxed text-brand-text placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-teal/30"
                        />
                    </section>
                )}
            </div>
        </div>
    );
}

function MetricMini({ icon, label, hint }: { icon: React.ReactNode; label: string; hint: string }) {
    return (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5">
            <div className="flex items-center gap-2 text-zinc-400">{icon}</div>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
            <p className="mt-0.5 text-xs text-zinc-600">{hint}</p>
        </div>
    );
}
