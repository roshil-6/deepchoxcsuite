'use client';

import { useOffice } from '@/lib/OfficeContext';
import { StrategyNotebook } from './workspaces/StrategyNotebook';
import { ProductKanban } from './workspaces/ProductKanban';
import { FinancialLedger } from './workspaces/FinancialLedger';
import { ScoutTerminal } from './workspaces/ScoutTerminal';
import { CalendarView } from './CalendarView';
import { Dashboard } from './Dashboard';
import { ReportsLibrary } from './ReportsLibrary';

import { FoundersOffice } from './FoundersOffice';
import { DexoRoom } from './Dexo/DexoRoom';
import { PitchDeckForge } from './PitchDeckForge';
import { WargameNexus } from './WargameNexus';
import { VCGauntlet } from './VCGauntlet';
import { OperationalDesk } from './OperationalDesk';
import { IntelligenceDiary } from './IntelligenceDiary';
import { CsuiteIntelligenceGuide } from './CsuiteIntelligenceGuide';
import { RoomChrome } from './RoomChrome';
import { getWorkspaceShellTheme } from '@/lib/roomThemes';
import { WORKSPACE_TITLES } from '@/components/ui/appNav';
import { User } from 'lucide-react';

function workspaceTitle(room: string) {
    return WORKSPACE_TITLES[room] ?? 'Workspace';
}

export function WorkspaceStage({
    onNewVenture,
    hideWorkspaceHeader,
}: {
    onNewVenture?: () => void;
    /** Hide the built-in room title row when the app shell provides a global header */
    hideWorkspaceHeader?: boolean;
}) {
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
            case 'founders_office':
                return <FoundersOffice />;
            case 'dexo':
                return <DexoRoom />;
            case 'forge':
                return (
                    <OperationalDesk>
                        <PitchDeckForge />
                    </OperationalDesk>
                );
            case 'wargame':
                return <WargameNexus />;
            case 'vc_gauntlet':
                return <VCGauntlet />;
            case 'intelligence_diary':
                return <IntelligenceDiary />;
            case 'personal_assistant':
                return <DexoRoom />;
            case 'suite_intelligence':
                return <CsuiteIntelligenceGuide />;
            case 'ceo':
                return (
                    <OperationalDesk>
                        <StrategyNotebook />
                    </OperationalDesk>
                );
            case 'pm':
                return (
                    <OperationalDesk>
                        <ProductKanban />
                    </OperationalDesk>
                );
            case 'accountant':
                return (
                    <OperationalDesk>
                        <FinancialLedger />
                    </OperationalDesk>
                );
            case 'scout':
                return (
                    <OperationalDesk>
                        <ScoutTerminal />
                    </OperationalDesk>
                );
            case 'cmo':
                return (
                    <OperationalDesk>
                        <PitchDeckForge />
                    </OperationalDesk>
                );
            default:
                return <Dashboard onNewVenture={onNewVenture} />;
        }
    };

    return (
        <div className="relative flex min-h-0 w-full flex-1 flex-col">
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
                className={`relative z-10 flex min-h-0 flex-1 flex-col animate-in fade-in duration-300 ${shell.immersive ? '' : 'py-3 sm:py-4'}`}
            >
                {!shell.immersive && !hideWorkspaceHeader && (
                    <header className="mb-2 flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.04] pb-2.5">
                        <h1 className="text-sm font-normal tracking-normal text-brand-text/95 sm:text-[15px]">
                            {workspaceTitle(activeRoom)}
                        </h1>
                        <div className="flex items-center gap-1 sm:gap-2">
                            <div
                                className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] py-1 pl-1 pr-3"
                                role="presentation"
                            >
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.05]">
                                    <User className="h-3.5 w-3.5 text-brand-text" aria-hidden />
                                </span>
                                <span className="hidden text-sm text-brand-muted sm:inline">Research</span>
                            </div>
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
