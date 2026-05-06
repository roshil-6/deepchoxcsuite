'use client';

import { useOffice } from '@/lib/OfficeContext';
import { CalendarView } from './CalendarView';
import { Dashboard } from './Dashboard';
import { ReportsLibrary } from './ReportsLibrary';

import { FoundersOffice } from './FoundersOffice';
import { DexoRoom } from './Dexo/DexoRoom';
import { DesksHub } from './Desks/DesksHub';
import { PitchDeckForge } from './PitchDeckForge';
import { WargameNexus } from './WargameNexus';
import { VCGauntlet } from './VCGauntlet';
import { OperationalDesk } from './OperationalDesk';
import { IntelligenceDiary } from './IntelligenceDiary';
import { CsuiteIntelligenceGuide } from './CsuiteIntelligenceGuide';
import { RoomChrome } from './RoomChrome';
import { DeskChat } from './workspaces/DeskChat';
import { DexoResearchRoom } from './DexoResearchRoom';
import { Trivily } from './Trivily';
import { getWorkspaceShellTheme } from '@/lib/roomThemes';

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
            case 'desks_hub':
                return <DesksHub />;
            case 'intelligence_diary':
                return <IntelligenceDiary />;
            case 'personal_assistant':
                return <DexoRoom />;
            case 'suite_intelligence':
                return <CsuiteIntelligenceGuide />;
            case 'dexo_daily':
                return <DexoResearchRoom />;
            case 'trivily':
                return <Trivily />;
            case 'ceo':
                return <DeskChat deskId="ceo" />;
            case 'pm':
                return <DeskChat deskId="pm" />;
            case 'accountant':
                return <DeskChat deskId="accountant" />;
            case 'scout':
                return <DeskChat deskId="scout" />;
            case 'cmo':
                return <DeskChat deskId="cmo" />;
            default:
                return <Dashboard onNewVenture={onNewVenture} />;
        }
    };

    return (
        <div className="relative flex min-h-0 w-full flex-1 flex-col">
            <div
                className="relative z-10 flex min-h-0 flex-1 flex-col animate-in fade-in duration-300"
            >
                <RoomChrome immersive={shell.immersive} chromeClass={shell.chrome}>
                    {renderWorkspace()}
                </RoomChrome>
            </div>
        </div>
    );
}
