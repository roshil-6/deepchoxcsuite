import type { LucideIcon } from 'lucide-react';
import {
    Briefcase,
    Cpu,
    BarChart3,
    LineChart,
    Rocket,
    LayoutGrid,
    CalendarDays,
    Settings2,
    FileText,
    Sparkles,
    Notebook,
} from 'lucide-react';
import { RESEARCH_STAFF, sidebarPrimaryLabel } from '@/lib/researchStaffLabels';

export type AppNavRoom =
    | 'personal_assistant'
    | 'ceo'
    | 'pm'
    | 'accountant'
    | 'scout'
    | 'cmo'
    | 'dashboard'
    | 'calendar'
    | 'reports'
    | 'dexo'
    | 'intelligence_diary'
    | 'suite_intelligence';

export type NavItemDef = {
    room: AppNavRoom;
    label: string;
    short: string;
    icon: LucideIcon;
};

function rail(s: string): string {
    return sidebarPrimaryLabel(s);
}

export const APP_NAV_ITEMS: NavItemDef[] = [
    { room: 'dexo', label: 'Dexo', short: 'Dexo', icon: Sparkles },
    { room: 'dashboard', label: rail('Executive overview'), short: rail('Executive overview'), icon: LayoutGrid },
    { room: 'ceo', label: rail(RESEARCH_STAFF.ceo.navTitle), short: rail(RESEARCH_STAFF.ceo.navTitle), icon: Briefcase },
    { room: 'pm', label: rail(RESEARCH_STAFF.pm.navTitle), short: rail(RESEARCH_STAFF.pm.navTitle), icon: Cpu },
    { room: 'accountant', label: rail(RESEARCH_STAFF.accountant.navTitle), short: rail(RESEARCH_STAFF.accountant.navTitle), icon: BarChart3 },
    { room: 'scout', label: rail(RESEARCH_STAFF.scout.navTitle), short: rail(RESEARCH_STAFF.scout.navTitle), icon: LineChart },
    { room: 'cmo', label: rail(RESEARCH_STAFF.cmo.navTitle), short: rail(RESEARCH_STAFF.cmo.navTitle), icon: Rocket },
    { room: 'calendar', label: rail('Calendar'), short: rail('Calendar'), icon: CalendarDays },
    { room: 'reports', label: rail('Knowledge base'), short: rail('Knowledge base'), icon: FileText },
    { room: 'intelligence_diary', label: rail('Neural diary'), short: rail('Neural diary'), icon: Notebook },
    { room: 'suite_intelligence', label: rail('AI team network'), short: rail('AI team network'), icon: Settings2 },
];

export const WORKSPACE_TITLES: Record<string, string> = {
    personal_assistant: 'Dexo',
    ceo: RESEARCH_STAFF.ceo.navTitle,
    pm: RESEARCH_STAFF.pm.navTitle,
    accountant: RESEARCH_STAFF.accountant.navTitle,
    scout: RESEARCH_STAFF.scout.navTitle,
    cmo: RESEARCH_STAFF.cmo.navTitle,
    dashboard: 'Executive overview',
    calendar: 'Calendar',
    suite_intelligence: 'AI team network',
    dexo: 'Dexo',
    reports: 'Knowledge base',
    intelligence_diary: 'Neural diary',
    forge: 'Pitch and narrative forge',
    wargame: 'Wargame',
    founders_office: 'Founders office',
    vc_gauntlet: RESEARCH_STAFF.shark.navTitle,
    org_structure: 'Org structure',
};
