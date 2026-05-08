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
    Layers,
    Globe,
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
    | 'dexo_daily'
    | 'intelligence_diary'
    | 'suite_intelligence'
    | 'desks_hub';

export type NavItemDef = {
    room: AppNavRoom;
    label: string;
    short: string;
    icon: LucideIcon;
};

export type NavGroup = {
    id: string;
    label: string | null;
    items: NavItemDef[];
};

function rail(s: string): string {
    return sidebarPrimaryLabel(s);
}

/** Flat list kept for any code that still iterates APP_NAV_ITEMS */
export const APP_NAV_ITEMS: NavItemDef[] = [
    { room: 'dexo',               label: 'Deepchox',                                           short: 'Deepchox',      icon: Sparkles   },
    { room: 'dashboard',          label: rail('Executive overview'),                        short: 'Overview',  icon: LayoutGrid },
    { room: 'desks_hub',          label: 'AI Desks',                                        short: 'Desks',     icon: Layers     },
    { room: 'dexo_daily',         label: 'Daily research',                                  short: 'Research',  icon: Globe      },
    { room: 'ceo',                label: rail(RESEARCH_STAFF.ceo.navTitle),                 short: 'Strategy',  icon: Briefcase  },
    { room: 'pm',                 label: rail(RESEARCH_STAFF.pm.navTitle),                  short: 'Product',   icon: Cpu        },
    { room: 'accountant',         label: rail(RESEARCH_STAFF.accountant.navTitle),          short: 'Finance',   icon: BarChart3  },
    { room: 'scout',              label: rail(RESEARCH_STAFF.scout.navTitle),               short: 'Market',    icon: LineChart  },
    { room: 'cmo',                label: rail(RESEARCH_STAFF.cmo.navTitle),                 short: 'Marketing', icon: Rocket     },
    { room: 'calendar',           label: rail('Calendar'),                                  short: 'Calendar',  icon: CalendarDays },
    { room: 'reports',            label: rail('Knowledge base'),                            short: 'Knowledge', icon: FileText   },
    { room: 'intelligence_diary', label: rail('Neural diary'),                              short: 'Diary',     icon: Notebook   },
    { room: 'suite_intelligence', label: rail('AI team network'),                           short: 'AI Team',   icon: Settings2  },
];

/** Grouped nav used by the sidebar — clear visual hierarchy */
export const APP_NAV_GROUPS: NavGroup[] = [
    {
        id: 'primary',
        label: null,
        items: [
            { room: 'dexo',       label: 'Deepchox',            short: 'Deepchox',     icon: Sparkles },
            { room: 'dexo_daily', label: 'Daily research',  short: 'Research', icon: Globe    },
        ],
    },
    {
        id: 'workspace',
        label: 'WORKSPACE',
        items: [
            { room: 'dashboard',  label: rail('Executive overview'), short: 'Overview', icon: LayoutGrid },
            { room: 'desks_hub',  label: 'AI Desks',                 short: 'Desks',    icon: Layers     },
        ],
    },
    {
        id: 'research',
        label: 'RESEARCH STAFF',
        items: [
            { room: 'ceo',        label: 'Strategy',  short: 'Strategy',  icon: Briefcase  },
            { room: 'pm',         label: 'Product',   short: 'Product',   icon: Cpu        },
            { room: 'accountant', label: 'Finance',   short: 'Finance',   icon: BarChart3  },
            { room: 'scout',      label: 'Market',    short: 'Market',    icon: LineChart  },
            { room: 'cmo',        label: 'Growth',    short: 'Growth',    icon: Rocket     },
        ],
    },
    {
        id: 'tools',
        label: 'TOOLS',
        items: [
            { room: 'calendar',           label: rail('Calendar'),        short: 'Calendar',  icon: CalendarDays },
            { room: 'reports',            label: rail('Knowledge base'),  short: 'Knowledge', icon: FileText     },
            { room: 'intelligence_diary', label: rail('Neural diary'),    short: 'Diary',     icon: Notebook     },
            { room: 'suite_intelligence', label: rail('AI team network'), short: 'AI Team',   icon: Settings2    },
        ],
    },
];

export const WORKSPACE_TITLES: Record<string, string> = {
    personal_assistant:  'Deepchox',
    ceo:                 RESEARCH_STAFF.ceo.navTitle,
    pm:                  RESEARCH_STAFF.pm.navTitle,
    accountant:          RESEARCH_STAFF.accountant.navTitle,
    scout:               RESEARCH_STAFF.scout.navTitle,
    cmo:                 RESEARCH_STAFF.cmo.navTitle,
    dashboard:           'Executive overview',
    calendar:            'Calendar',
    suite_intelligence:  'AI team network',
    dexo:                'Deepchox',
    dexo_daily:          'Daily research',
    reports:             'Knowledge base',
    intelligence_diary:  'Neural diary',
    desks_hub:           'AI Desks',
    forge:               'Pitch and narrative forge',
    wargame:             'Wargame',
    founders_office:     'Founders office',
    vc_gauntlet:         RESEARCH_STAFF.shark.navTitle,
    org_structure:       'Org structure',
};
