'use client';

import React from 'react';
import { useOffice } from '@/lib/OfficeContext';
import { StrategyNotebook } from './workspaces/StrategyNotebook';
import { ProductKanban } from './workspaces/ProductKanban';
import { FinancialLedger } from './workspaces/FinancialLedger';
import { ScoutTerminal } from './workspaces/ScoutTerminal';
import { CalendarView } from './CalendarView';
import { Dashboard } from './Dashboard';
import { ReportsLibrary } from './ReportsLibrary';

import { Boardroom } from './Boardroom';
import { FoundersOffice } from './FoundersOffice';
import { DexoCommandCenter } from './DexoCommandCenter';
import { PitchDeckForge } from './PitchDeckForge';
import { WargameNexus } from './WargameNexus';
import { OperationalDesk } from './OperationalDesk';
import { IntelligenceDiary } from './IntelligenceDiary';
import { PersonalAssistant } from './PersonalAssistant';
import { EnquiriesHub } from './EnquiriesHub';
import { CsuiteIntelligenceGuide } from './CsuiteIntelligenceGuide';
import { RoomChrome } from './RoomChrome';
import { getWorkspaceShellTheme } from '@/lib/roomThemes';
import { ChevronDown, User } from 'lucide-react';
const WORKSPACE_TITLES: Record<string, string> = {
    ceo: 'CEO',
    pm: 'CTO / PM',
    scout: 'CSO / Scout',
    cmo: 'CMO',
    forge: 'Pitch forge',
    wargame: 'Wargame',
    founders_office: 'Founders office',
    vc_gauntlet: 'VC gauntlet',
    accountant: 'CFO',
    dashboard: 'Dashboard',
    reports: 'Knowledge Base',
    calendar: 'Calendar',
    boardroom: 'Boardroom',
    intelligence_diary: 'Neural Diary',
    dexo: 'Dexo Core',
    org_structure: 'Org structure',
    personal_assistant: 'Personal Assistant',
    enquiries: 'Enquiries',
    suite_intelligence: 'Suite intelligence',
};

function workspaceTitle(room: string) {
    return WORKSPACE_TITLES[room] ?? 'Workspace';
}

export function WorkspaceStage({ onNewVenture }: { onNewVenture?: () => void }) {
    const { activeRoom } = useOffice();
    const shell = getWorkspaceShellTheme(activeRoom);

    const renderWorkspace = () => {
        switch (activeRoom) {
            case 'dashboard':
                return <Dashboard onNewVenture={onNewVenture} />;
            case 'reports':
                return <ReportsLibrary />;
            case 'calendar':
                return <CalendarView />;
            case 'boardroom':
                return <Boardroom />;
            case 'founders_office':
                return <FoundersOffice />;
            case 'dexo':
                return <DexoCommandCenter />;
            case 'forge':
                return <PitchDeckForge />;
            case 'wargame':
                return <WargameNexus />;
            case 'intelligence_diary':
                return <IntelligenceDiary />;
            case 'personal_assistant':
                return <PersonalAssistant />;
            case 'enquiries':
                return <EnquiriesHub />;
            case 'suite_intelligence':
                return <CsuiteIntelligenceGuide />;
            case 'ceo':
                return (
                    <OperationalDesk hideSideChat>
                        <StrategyNotebook />
                    </OperationalDesk>
                );
            case 'pm':
                return (
                    <OperationalDesk hideSideChat>
                        <ProductKanban />
                    </OperationalDesk>
                );
            case 'accountant':
                return (
                    <OperationalDesk hideSideChat>
                        <FinancialLedger />
                    </OperationalDesk>
                );
            case 'scout':
                return (
                    <OperationalDesk hideSideChat>
                        <ScoutTerminal />
                    </OperationalDesk>
                );
            case 'cmo':
                return (
                    <OperationalDesk hideSideChat>
                        <PitchDeckForge />
                    </OperationalDesk>
                );
            default:
                return <Dashboard onNewVenture={onNewVenture} />;
        }
    };

    return (
        <div className="relative flex h-full w-full flex-col overflow-hidden">
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${shell.wash}`} />
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    opacity: Number(shell.gridOpacity),
                    backgroundImage: `linear-gradient(${shell.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${shell.gridColor} 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                }}
            />

            <div
                className={
                    activeRoom === 'dexo'
                        ? 'relative z-10 flex min-h-0 flex-1 flex-col p-0'
                        : 'relative z-10 flex min-h-0 flex-1 flex-col px-4 py-4 animate-in fade-in duration-300 sm:px-5 sm:py-5'
                }
            >
                {!shell.immersive && (
                    <header className="mb-3 flex h-14 shrink-0 items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm sm:px-5">
                        <h1 className="text-[15px] font-medium tracking-tight text-brand-text">{workspaceTitle(activeRoom)}</h1>
                        <div className="flex items-center gap-1 sm:gap-2">
                            <button
                                type="button"
                                className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-brand-input/80 py-1 pl-1 pr-2 transition-colors hover:bg-brand-card sm:pr-3"
                            >
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06]">
                                    <User className="h-4 w-4 text-brand-text" aria-hidden />
                                </span>
                                <span className="hidden text-sm text-brand-muted sm:inline">Executive</span>
                                <ChevronDown className="hidden h-4 w-4 text-brand-muted sm:block" aria-hidden />
                            </button>
                        </div>
                    </header>
                )}
                <RoomChrome immersive={shell.immersive} chromeClass={shell.chrome}>
                    {renderWorkspace()}
                </RoomChrome>
            </div>
        </div>
    );
}
