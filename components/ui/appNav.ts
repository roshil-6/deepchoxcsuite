import type { LucideIcon } from 'lucide-react';
import {
    Sparkles,
    Briefcase,
    Cpu,
    BarChart3,
    LineChart,
    Rocket,
    LayoutGrid,
    Gavel,
    CalendarDays,
    Settings2,
    FileText,
    Bot,
    Notebook,
    Users,
} from 'lucide-react';

export type AppNavRoom =
    | 'personal_assistant'
    | 'ceo'
    | 'pm'
    | 'accountant'
    | 'scout'
    | 'cmo'
    | 'boardroom'
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
    short: string;
    icon: LucideIcon;
};

/** AI OS left rail — maps to OfficeContext rooms */
export const APP_NAV_ITEMS: NavItemDef[] = [
    { room: 'personal_assistant', label: 'Assistant', short: 'AI', icon: Sparkles },
    { room: 'ceo', label: 'CEO', short: 'CEO', icon: Briefcase },
    { room: 'pm', label: 'CTO · Product', short: 'CTO', icon: Cpu },
    { room: 'accountant', label: 'CFO', short: 'CFO', icon: BarChart3 },
    { room: 'scout', label: 'Market', short: 'Mkt', icon: LineChart },
    { room: 'cmo', label: 'GTM', short: 'GTM', icon: Rocket },
    { room: 'chief_of_staff', label: 'Chief of Staff', short: 'CoS', icon: Users },
    { room: 'boardroom', label: 'Board room', short: 'Board', icon: Gavel },
    { room: 'dashboard', label: 'Dashboard', short: 'Hub', icon: LayoutGrid },
    { room: 'calendar', label: 'Timeline', short: 'Time', icon: CalendarDays },
    { room: 'reports', label: 'Knowledge', short: 'Kb', icon: FileText },
    { room: 'dexo', label: 'Dexo', short: 'Dx', icon: Bot },
    { room: 'intelligence_diary', label: 'Diary', short: 'Di', icon: Notebook },
    { room: 'suite_intelligence', label: 'Suite', short: 'Sys', icon: Settings2 },
];

export const WORKSPACE_TITLES: Record<string, string> = {
    personal_assistant: 'Assistant',
    ceo: 'CEO',
    pm: 'CTO / Product',
    accountant: 'CFO',
    scout: 'Market',
    cmo: 'GTM',
    boardroom: 'Board room',
    dashboard: 'Dashboard',
    calendar: 'Timeline',
    suite_intelligence: 'Suite settings',
    dexo: 'Dexo Core',
    reports: 'Knowledge base',
    intelligence_diary: 'Neural diary',
    forge: 'Pitch forge',
    wargame: 'Wargame',
    founders_office: 'Founders office',
    vc_gauntlet: 'VC gauntlet',
    org_structure: 'Org structure',
    chief_of_staff: 'Chief of Staff',
};
