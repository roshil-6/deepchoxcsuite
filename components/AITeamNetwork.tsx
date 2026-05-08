'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Briefcase,
    Cpu,
    BarChart3,
    LineChart,
    Rocket,
    Sparkles,
    Gavel,
    MessageCircle,
    Network,
    GitBranch,
    ArrowRight,
    Zap,
    Shield,
    Target,
} from 'lucide-react';
import { RESEARCH_STAFF } from '@/lib/researchStaffLabels';
import { useOffice } from '@/lib/OfficeContext';

interface TeamMember {
    id: string;
    role: keyof typeof RESEARCH_STAFF;
    name: string;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    color: string;
    x: number;
    y: number;
    connections: string[];
}

const TEAM_MEMBERS: TeamMember[] = [
    {
        id: 'ceo',
        role: 'ceo',
        name: 'Strategy Lead',
        title: RESEARCH_STAFF.ceo.navTitle,
        subtitle: RESEARCH_STAFF.ceo.navHint,
        icon: <Briefcase className="h-5 w-5" />,
        color: '#94a3b8',
        x: 50,
        y: 20,
        connections: ['pm', 'cmo', 'scout', 'dexo'],
    },
    {
        id: 'pm',
        role: 'pm',
        name: 'Product Lead',
        title: RESEARCH_STAFF.pm.navTitle,
        subtitle: RESEARCH_STAFF.pm.navHint,
        icon: <Cpu className="h-5 w-5" />,
        color: '#3B82F6',
        x: 25,
        y: 45,
        connections: ['ceo', 'accountant', 'cmo', 'dexo'],
    },
    {
        id: 'accountant',
        role: 'accountant',
        name: 'Finance Lead',
        title: RESEARCH_STAFF.accountant.navTitle,
        subtitle: RESEARCH_STAFF.accountant.navHint,
        icon: <BarChart3 className="h-5 w-5" />,
        color: '#10B981',
        x: 75,
        y: 45,
        connections: ['ceo', 'pm', 'scout', 'dexo'],
    },
    {
        id: 'scout',
        role: 'scout',
        name: 'Market Intel',
        title: RESEARCH_STAFF.scout.navTitle,
        subtitle: RESEARCH_STAFF.scout.navHint,
        icon: <LineChart className="h-5 w-5" />,
        color: '#F59E0B',
        x: 15,
        y: 70,
        connections: ['ceo', 'cmo', 'dexo'],
    },
    {
        id: 'cmo',
        role: 'cmo',
        name: 'Growth Lead',
        title: RESEARCH_STAFF.cmo.navTitle,
        subtitle: RESEARCH_STAFF.cmo.navHint,
        icon: <Rocket className="h-5 w-5" />,
        color: '#F43F5E',
        x: 50,
        y: 70,
        connections: ['ceo', 'pm', 'scout', 'dexo'],
    },
    {
        id: 'shark',
        role: 'shark',
        name: 'Investor Test',
        title: RESEARCH_STAFF.shark.navTitle,
        subtitle: RESEARCH_STAFF.shark.navHint,
        icon: <Gavel className="h-5 w-5" />,
        color: '#06B6D4',
        x: 85,
        y: 70,
        connections: ['ceo', 'accountant', 'dexo'],
    },
    {
        id: 'dexo',
        role: 'dexo',
        name: 'Cross-Desk AI',
        title: RESEARCH_STAFF.dexo.navTitle,
        subtitle: RESEARCH_STAFF.dexo.navHint,
        icon: <Sparkles className="h-5 w-5" />,
        color: '#A855F7',
        x: 50,
        y: 50,
        connections: ['ceo', 'pm', 'accountant', 'scout', 'cmo', 'shark'],
    },
];

const FLOW_TYPES: Record<string, { label: string; color: string; description: string }> = {
    strategy: { label: 'Strategy Flow', color: '#94a3b8', description: 'Direction and prioritization' },
    execution: { label: 'Execution Flow', color: '#3B82F6', description: 'Product delivery and roadmap' },
    finance: { label: 'Finance Flow', color: '#10B981', description: 'Runway and capital planning' },
    intel: { label: 'Intel Flow', color: '#F59E0B', description: 'Market and competitive intel' },
    growth: { label: 'Growth Flow', color: '#F43F5E', description: 'GTM and positioning' },
    stress: { label: 'Stress Test', color: '#06B6D4', description: 'Investor readiness check' },
    cross: { label: 'Cross-Desk', color: '#A855F7', description: 'Multi-desk synthesis' },
};

export function AITeamNetwork({ embedded = false }: { embedded?: boolean }) {
    const { switchRoom, activeProject, agentSyncRunning } = useOffice();
    const [selectedMember, setSelectedMember] = useState<string | null>(null);
    const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);
    const [activeFlow, setActiveFlow] = useState<string | null>(null);

    const selectedData = useMemo(() => {
        return TEAM_MEMBERS.find((m) => m.id === selectedMember);
    }, [selectedMember]);

    const getMemberById = (id: string) => TEAM_MEMBERS.find((m) => m.id === id);

    const handleMemberClick = (member: TeamMember) => {
        setSelectedMember(member.id === selectedMember ? null : member.id);
    };

    const goToDesk = (role: string) => {
        if (role === 'shark') {
            switchRoom('vc_gauntlet');
        } else {
            switchRoom(role as Parameters<typeof switchRoom>[0]);
        }
    };

    return (
        <div className="w-full">
            {/* Header */}
            <div className={`flex items-center justify-between ${embedded ? 'mb-4' : 'mb-6'}`}>
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] shadow-[0_0_24px_-6px_rgba(255,255,255,0.07)]">
                        <Network className="h-5 w-5 text-white/70" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">AI team network</h3>
                        <p className="text-[11px] text-[var(--text-secondary)]">Desks, links, and how sync ties them together</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {agentSyncRunning && (
                        <span className="flex items-center gap-1.5 text-[11px] text-emerald-400/95">
                            <Zap className="h-3.5 w-3.5 animate-pulse" />
                            Syncing...
                        </span>
                    )}
                </div>
            </div>

            {/* Flow Type Filter */}
            <div className={`flex flex-wrap gap-2 ${embedded ? 'mb-4' : 'mb-6'}`}>
                <button
                    type="button"
                    onClick={() => setActiveFlow(null)}
                    className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all ${
                        activeFlow === null
                            ? 'border-white/10 bg-white/[0.05] text-[var(--text-primary)]'
                            : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--bg-elevated)]'
                    }`}
                >
                    All connections
                </button>
                {Object.entries(FLOW_TYPES).map(([key, flow]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setActiveFlow(activeFlow === key ? null : key)}
                        className={`rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                            activeFlow === key
                                ? 'border-white/10 text-[var(--text-primary)]'
                                : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--bg-elevated)]'
                        }`}
                        style={{
                            background: activeFlow === key ? `${flow.color}18` : 'transparent',
                        }}
                    >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: flow.color }} />
                        {flow.label}
                    </button>
                ))}
            </div>

            {/* Network Diagram */}
            <div
                className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/10 bg-[var(--bg-primary)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
            >
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.5]"
                    aria-hidden
                    style={{
                        backgroundImage:
                            'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(255,255,255,0.07), transparent 55%)',
                    }}
                />
                {/* Grid Background */}
                <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)
                        `,
                        backgroundSize: '40px 40px',
                    }}
                />

                {/* Connection Lines */}
                <svg className="absolute inset-0 h-full w-full">
                    <defs>
                        <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                            <polygon points="0 0, 6 3, 0 6" fill="rgba(255,255,255,0.15)" />
                        </marker>
                    </defs>
                    {TEAM_MEMBERS.map((member) =>
                        member.connections.map((connId) => {
                            const conn = getMemberById(connId);
                            if (!conn) return null;

                            const isHighlighted =
                                hoveredConnection === `${member.id}-${connId}` ||
                                hoveredConnection === `${connId}-${member.id}` ||
                                selectedMember === member.id ||
                                selectedMember === connId;

                            const isDimmed =
                                selectedMember &&
                                selectedMember !== member.id &&
                                selectedMember !== connId;

                            const shouldShowFlow = !activeFlow || (activeFlow === 'cross' && member.id === 'dexo');

                            return (
                                <motion.line
                                    key={`${member.id}-${connId}`}
                                    x1={`${member.x}%`}
                                    y1={`${member.y}%`}
                                    x2={`${conn.x}%`}
                                    y2={`${conn.y}%`}
                                    stroke={isHighlighted ? member.color : 'rgba(255,255,255,0.07)'}
                                    strokeWidth={isHighlighted ? 2 : 1}
                                    strokeDasharray={member.id === 'dexo' || connId === 'dexo' ? '0' : '4 4'}
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{
                                        pathLength: 1,
                                        opacity: isDimmed ? 0.2 : shouldShowFlow ? 1 : 0.3,
                                    }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    onMouseEnter={() => setHoveredConnection(`${member.id}-${connId}`)}
                                    onMouseLeave={() => setHoveredConnection(null)}
                                    className="cursor-pointer"
                                />
                            );
                        })
                    )}
                </svg>

                {/* Team Members */}
                {TEAM_MEMBERS.map((member, index) => {
                    const isSelected = selectedMember === member.id;
                    const isDimmed = selectedMember && selectedMember !== member.id && !member.connections.includes(selectedMember);
                    const isConnected = selectedMember && member.connections.includes(selectedMember);

                    return (
                        <motion.button
                            key={member.id}
                            type="button"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                                scale: isSelected ? 1.1 : 1,
                                opacity: isDimmed ? 0.3 : 1,
                            }}
                            transition={{ delay: index * 0.1, duration: 0.4 }}
                            onClick={() => handleMemberClick(member)}
                            className="absolute -translate-x-1/2 -translate-y-1/2"
                            style={{
                                left: `${member.x}%`,
                                top: `${member.y}%`,
                            }}
                        >
                            <div
                                className={`relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all ${
                                    isSelected
                                        ? 'border-white/10 shadow-[0_0_28px_-4px_rgba(255,255,255,0.07)]'
                                        : 'border-[var(--border)] hover:border-white/10'
                                }`}
                                style={{
                                    background: isSelected
                                        ? `linear-gradient(180deg, ${member.color}22, rgba(255,255,255,0.07))`
                                        : 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(30,30,30,0.4))',
                                    boxShadow: isSelected ? `0 0 24px ${member.color}18` : undefined,
                                }}
                            >
                                {/* Status Indicator */}
                                {isConnected && (
                                    <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                                        <span
                                            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                                            style={{ background: member.color }}
                                        />
                                        <span
                                            className="relative inline-flex h-2.5 w-2.5 rounded-full"
                                            style={{ background: member.color }}
                                        />
                                    </span>
                                )}

                                {/* Icon */}
                                <div
                                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                                    style={{ color: member.color }}
                                >
                                    {member.icon}
                                </div>

                                {/* Label */}
                                <div className="text-center">
                                    <p className="text-[11px] font-medium text-[var(--text-primary)]">{member.name}</p>
                                    <p className="max-w-[80px] truncate text-[9px] text-[var(--text-secondary)]">{member.subtitle}</p>
                                </div>
                            </div>
                        </motion.button>
                    );
                })}

                {/* Center Badge for Deepchox */}
                <motion.div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
                >
                    <div
                        className="h-24 w-24 rounded-full border border-dashed border-white/10"
                        style={{ borderRadius: '50%' }}
                    />
                </motion.div>
            </div>

            {/* Selected Member Details */}
            <AnimatePresence>
                {selectedData && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-4 rounded-xl border border-white/10 bg-[var(--bg-card)]/90 p-4 shadow-[0_0_32px_-10px_rgba(255,255,255,0.07)]"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div
                                    className="flex h-12 w-12 items-center justify-center rounded-xl"
                                    style={{
                                        background: `linear-gradient(180deg, ${selectedData.color}20, ${selectedData.color}08)`,
                                        color: selectedData.color,
                                    }}
                                >
                                    {selectedData.icon}
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">{selectedData.title}</h4>
                                    <p className="text-[11px] text-[var(--text-secondary)]">{selectedData.subtitle}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => goToDesk(selectedData.id)}
                                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-medium text-[var(--text-primary)] transition-colors hover:bg-white/[0.05]"
                                style={{ background: `${selectedData.color}12` }}
                            >
                                Open Desk
                                <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        <p className="mt-3 text-[12px] leading-relaxed text-[var(--text-secondary)]">
                            {RESEARCH_STAFF[selectedData.role].deskHelp}
                        </p>

                        {/* Connected To */}
                        <div className="mt-4 border-t border-[var(--border)] pt-3">
                            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                                Connected to
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {selectedData.connections.map((connId) => {
                                    const conn = getMemberById(connId);
                                    if (!conn) return null;
                                    return (
                                        <button
                                            key={connId}
                                            type="button"
                                            onClick={() => setSelectedMember(connId)}
                                            className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2 py-1 transition-colors hover:border-white/10 hover:bg-white/[0.05]"
                                        >
                                            <span
                                                className="h-1.5 w-1.5 rounded-full"
                                                style={{ background: conn.color }}
                                            />
                                            <span className="text-[11px] text-[var(--text-secondary)]">{conn.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Network Stats */}
            <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/10 bg-[var(--bg-elevated)] p-3 text-center">
                    <p className="text-lg font-semibold text-[var(--text-primary)]">{TEAM_MEMBERS.length}</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">AI teammates</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[var(--bg-elevated)] p-3 text-center">
                    <p className="text-lg font-semibold text-[var(--text-primary)]">
                        {TEAM_MEMBERS.reduce((acc, m) => acc + m.connections.length, 0)}
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)]">Active links</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[var(--bg-elevated)] p-3 text-center">
                    <p className="text-lg font-semibold text-emerald-400/95">
                        {activeProject?.agentStaffSnapshot ? 'Synced' : 'Ready'}
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)]">Network status</p>
                </div>
            </div>
        </div>
    );
}

