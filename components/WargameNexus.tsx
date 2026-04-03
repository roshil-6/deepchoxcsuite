'use client';

import React, { useState, useMemo } from 'react';
import { ShieldAlert, Play } from 'lucide-react';
import { aggregateImpact, getAffectedDesks } from '@/lib/impact/impactEngine';
import { wargameStatsToImpactResult } from '@/lib/impact/adapters/wargameAdapter';

export function WargameNexus() {
    // Stats (0-100)
    const [stats, setStats] = useState({
        resilience: 75,
        velocity: 60,
        cashRunway: 85,
        marketFit: 40
    });

    const [isSimulating, setIsSimulating] = useState(false);
    const [log, setLog] = useState<string[]>([]);

    const unifiedImpact = useMemo(() => aggregateImpact([wargameStatsToImpactResult(stats)]), [stats]);
    const wargameDesks = useMemo(() => getAffectedDesks(unifiedImpact), [unifiedImpact]);

    const runSimulation = () => {
        setIsSimulating(true);
        setLog([]);

        let steps = 0;
        const interval = setInterval(() => {
            steps++;

            // Random Event
            const events = [
                { msg: "Competitor raises Series A ($20M). Market clutter increases.", impact: { resilience: -10, marketFit: -5 } },
                { msg: "Viral marketing campaign succeeds. Usage spikes.", impact: { velocity: 15, marketFit: 10 } },
                { msg: "Cloud provider outage. Downtime recorded.", impact: { resilience: -5, velocity: -10 } },
                { msg: "Key hire poached by FAANG.", impact: { resilience: -15 } },
                { msg: "Unexpected tax regulation compliance costs.", impact: { cashRunway: -10 } },
                { msg: "Product Hunt launch trends #1.", impact: { marketFit: 20, velocity: 10 } }
            ];

            const event = events[Math.floor(Math.random() * events.length)];

            setStats(prev => ({
                resilience: Math.min(100, Math.max(0, prev.resilience + (event.impact.resilience || 0))),
                velocity: Math.min(100, Math.max(0, prev.velocity + (event.impact.velocity || 0))),
                cashRunway: Math.min(100, Math.max(0, prev.cashRunway + (event.impact.cashRunway || 0))),
                marketFit: Math.min(100, Math.max(0, prev.marketFit + (event.impact.marketFit || 0))),
            }));

            setLog(prev => [`[${new Date().toLocaleTimeString()}] ${event.msg}`, ...prev]);

            if (steps >= 5) {
                clearInterval(interval);
                setIsSimulating(false);
            }
        }, 1500);
    };

    return (
        <div className="relative flex h-full flex-col overflow-hidden bg-black p-6 font-mono text-zinc-300">
            {/* Grid Overlay */}
            <div
                className="pointer-events-none absolute inset-0 z-0 opacity-[0.12]"
                style={{
                    backgroundImage:
                        'linear-gradient(rgba(168, 85, 247, 0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 85, 247, 0.2) 1px, transparent 1px)',
                    backgroundSize: '50px 50px',
                }}
            />

            {/* Header */}
            <div className="z-10 mb-8 flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                    <ShieldAlert className="h-6 w-6 animate-pulse text-violet-400" />
                    <h1 className="text-2xl font-bold uppercase tracking-widest text-violet-300">Wargame Nexus</h1>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                    <div className="rounded border border-brand-border bg-brand-panel/90 px-3 py-1 text-xs text-brand-muted">
                        SIMULATION STATUS: {isSimulating ? 'RUNNING' : 'IDLE'}
                    </div>
                    <p className="max-w-[14rem] text-[10px] leading-snug text-zinc-500">
                        Impact core: {unifiedImpact.severity} · {wargameDesks.join(', ') || '—'}
                    </p>
                </div>
            </div>

            <div className="z-10 grid min-h-0 flex-1 grid-cols-1 gap-8 lg:grid-cols-2">

                {/* Visualizer (Bars for now, Radar hard without library) */}
                <div className="relative flex flex-col justify-center gap-8 overflow-hidden rounded-xl border border-brand-border bg-brand-panel/50 p-6">
                    {['resilience', 'velocity', 'cashRunway', 'marketFit'].map((stat) => (
                        <div key={stat} className="space-y-2">
                            <div className="flex justify-between text-xs uppercase font-bold tracking-wider">
                                <span>{stat}</span>
                                <span>{stats[stat as keyof typeof stats]}%</span>
                            </div>
                            <div className="h-4 overflow-hidden rounded-full border border-brand-border bg-brand-input/80">
                                <div
                                    className="relative h-full bg-violet-500 transition-all duration-700 ease-out"
                                    style={{ width: `${stats[stat as keyof typeof stats]}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Retro Button */}
                    <button
                        onClick={runSimulation}
                        disabled={isSimulating}
                        className="group relative mt-8 flex items-center justify-center gap-3 overflow-hidden border-2 border-violet-500 py-4 font-bold uppercase tracking-[0.2em] transition-all hover:bg-violet-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Play className="h-5 w-5 fill-current" />
                        Run Stress Test
                        {isSimulating && <div className="absolute inset-0 translate-x-[-100%] animate-[slide_2s_infinite] bg-violet-500/15" />}
                    </button>
                </div>

                {/* Log Console */}
                <div className="custom-scrollbar overflow-y-auto rounded-xl border border-zinc-800 bg-black p-4 font-mono text-xs shadow-inner">
                    <div className="mb-2 text-zinc-600">admin@nexus:~$ tail -f /var/log/simulation</div>
                    {isSimulating && log.length === 0 && (
                        <div className="animate-pulse text-zinc-500">Initializing Scenario Generator...</div>
                    )}
                    {log.map((entry, i) => (
                        <div key={i} className="mb-2 animate-in fade-in slide-in-from-left-2 border-l-2 border-zinc-700 pl-2">
                            <span className="mr-2 opacity-50">{entry.split(']')[0]}]</span>
                            <span className={entry.includes('success') ? 'text-violet-300' : entry.includes('outage') || entry.includes('cost') ? 'text-red-400' : 'text-zinc-400'}>
                                {entry.split(']')[1]}
                            </span>
                        </div>
                    ))}
                    {!isSimulating && log.length > 0 && (
                        <div className="mt-4 space-y-2 border-t border-zinc-800 pt-2 text-zinc-500">
                            <p>Simulation Complete. Report saved.</p>
                            <p className="text-[10px] leading-relaxed text-zinc-400">
                                Unified impact: {unifiedImpact.severity} · desks {wargameDesks.join(', ') || '—'} · escalation{' '}
                                {unifiedImpact.requiresEscalation ? 'yes' : 'no'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
