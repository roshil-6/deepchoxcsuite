import type { LucideIcon } from 'lucide-react';
import {
    MessageCircle,
    Briefcase,
    Cpu,
    BarChart3,
    LineChart,
    Rocket,
    LayoutGrid,
    CalendarDays,
    Settings2,
    FileText,
    Bot,
    Notebook,
    Users,
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
    | 'suite_intelligence'
    | 'chief_of_staff';

export type NavItemDef = {
    room: AppNavRoom;
    label: string;
    /** Kept for compatibility — same as label (no abbreviations in UI). */
    short: string;
    icon: LucideIcon;
};

function rail(s: string): string {
    return sidebarPrimaryLabel(s);
}

/** Left rail — short primary labels (no clause after “ and ”). */
export const APP_NAV_ITEMS: NavItemDef[] = [
    { room: 'personal_assistant', label: rail('Personal Assistant'), short: rail('Personal Assistant'), icon: MessageCircle },
    { room: 'dashboard', label: rail('Executive overview'), short: rail('Executive overview'), icon: LayoutGrid },
    { room: 'ceo', label: rail(RESEARCH_STAFF.ceo.navTitle), short: rail(RESEARCH_STAFF.ceo.navTitle), icon: Briefcase },
    { room: 'pm', label: rail(RESEARCH_STAFF.pm.navTitle), short: rail(RESEARCH_STAFF.pm.navTitle), icon: Cpu },
    { room: 'accountant', label: rail(RESEARCH_STAFF.accountant.navTitle), short: rail(RESEARCH_STAFF.accountant.navTitle), icon: BarChart3 },
    { room: 'scout', label: rail(RESEARCH_STAFF.scout.navTitle), short: rail(RESEARCH_STAFF.scout.navTitle), icon: LineChart },
    { room: 'cmo', label: rail(RESEARCH_STAFF.cmo.navTitle), short: rail(RESEARCH_STAFF.cmo.navTitle), icon: Rocket },
    { room: 'chief_of_staff', label: rail(RESEARCH_STAFF.chief_of_staff.navTitle), short: rail(RESEARCH_STAFF.chief_of_staff.navTitle), icon: Users },
    { room: 'calendar', label: rail('Calendar'), short: rail('Calendar'), icon: CalendarDays },
    { room: 'reports', label: rail('Knowledge base'), short: rail('Knowledge base'), icon: FileText },
    { room: 'dexo', label: rail(RESEARCH_STAFF.dexo.navTitle), short: rail(RESEARCH_STAFF.dexo.navTitle), icon: Bot },
    { room: 'intelligence_diary', label: rail('Neural diary'), short: rail('Neural diary'), icon: Notebook },
    { room: 'suite_intelligence', label: rail('AI team network'), short: rail('AI team network'), icon: Settings2 },
];

/** Page / header titles when a room is active */
export const WORKSPACE_TITLES: Record<string, string> = {
    personal_assistant: 'Personal Assistant',
    ceo: RESEARCH_STAFF.ceo.navTitle,
    pm: RESEARCH_STAFF.pm.navTitle,
    accountant: RESEARCH_STAFF.accountant.navTitle,
    scout: RESEARCH_STAFF.scout.navTitle,
    cmo: RESEARCH_STAFF.cmo.navTitle,
    dashboard: 'Executive overview',
    calendar: 'Calendar',
    suite_intelligence: 'AI team network',
    dexo: RESEARCH_STAFF.dexo.navTitle,
    reports: 'Knowledge base',
    intelligence_diary: 'Neural diary',
    forge: 'Pitch and narrative forge',
    wargame: 'Wargame',
    founders_office: 'Founders office',
    vc_gauntlet: RESEARCH_STAFF.shark.navTitle,
    org_structure: 'Org structure',
    chief_of_staff: RESEARCH_STAFF.chief_of_staff.navTitle,
};
