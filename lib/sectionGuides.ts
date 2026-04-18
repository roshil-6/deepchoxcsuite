/**
 * Per-room walkthrough copy. Shown by SectionGuideCoach when entering a workspace.
 * Keep steps short; "lookFor" points at on-screen affordances.
 */

export type SectionGuideStep = {
    title: string;
    body: string;
    /** Hint for where to find the control or surface in this room */
    lookFor?: string;
};

const DASHBOARD: SectionGuideStep[] = [
    {
        title: 'Executive overview',
        body: 'This is your venture command center: health metrics, staff sync, and a snapshot of strategy, product, finance, and market coverage.',
        lookFor: 'Venture name and date in the header; Sync Staff refreshes AI desk research.',
    },
    {
        title: 'Overview, Analytics, Activity',
        body: 'Use the tabs to move between the main dashboard, deeper charts, and a log of what changed recently.',
        lookFor: 'Three tabs under the header — Overview · Analytics · Activity.',
    },
    {
        title: 'Execution score & desk coverage',
        body: 'Scores reflect what you have saved in the venture record. The desk coverage row links Strategy, Market, Finance, Product, and Growth to your persisted fields.',
        lookFor: 'Metric cards and the colored desk coverage strip on the Overview tab.',
    },
    {
        title: 'Jump to a desk',
        body: 'Open any research desk from the left rail when you want to edit narrative, backlog, ledger, or market intel — the dashboard stays the bird’s-eye view.',
        lookFor: 'Left navigation (desktop) or menu (mobile).',
    },
];

const DEXO: SectionGuideStep[] = [
    {
        title: 'Dexo command center',
        body: 'Dexo reads your full venture record and produces cross-functional analysis — strategy gaps, product risks, finance flags, and market signals in one pass.',
        lookFor: 'Central orb and the analysis report area when a run completes.',
    },
    {
        title: 'Chat & voice',
        body: 'Ask follow-ups in text or use the microphone. Analysis can run in the background while you talk or type.',
        lookFor: 'Message bar at the bottom; mic and voice controls near the orb.',
    },
    {
        title: 'History & settings',
        body: 'Past threads and voice presets stay with this venture. Token usage (on Founder) appears for analyses and messages.',
        lookFor: 'Thread list / history controls and the settings gear if shown.',
    },
];

const CEO: SectionGuideStep[] = [
    {
        title: 'Strategy & direction desk',
        body: 'Shape mission, narrative, phases, and priorities. Everything you save here feeds staff sync and Dexo.',
        lookFor: 'Hub tiles for strategic intent, vision, timeline, and narrative.',
    },
    {
        title: 'Strategy narrative & flow',
        body: 'Open the full thesis, visualise your plan as boxes and links, and edit phase horizons with dates and notes.',
        lookFor: 'Left tool strip — Strategy narrative, Visualise your plan, Edit phase timeline.',
    },
    {
        title: 'Team & schedule',
        body: 'Use team workspace for roles and threads; schedule captures critical dates and tasks tied to the venture.',
        lookFor: 'Team workspace and Schedule & critical work in the desk tool list.',
    },
    {
        title: 'Desk chat',
        body: 'The chat rail answers CEO-scoped questions using your saved strategy and venture context.',
        lookFor: 'Chat panel on the right (desktop) or expand the assistant on mobile.',
    },
];

const PM: SectionGuideStep[] = [
    {
        title: 'Product & delivery desk',
        body: 'Plan execution from backlog to shipped work: board, roadmap text, war room notes, recent actions, and planning maps.',
        lookFor: 'Tool icons — board, roadmap, war room, recent, planning, docs.',
    },
    {
        title: 'Execution board',
        body: 'Kanban columns run Backlog → In progress → Next up → Done. Cards persist on the venture.',
        lookFor: 'Board view with draggable-style columns.',
    },
    {
        title: 'Roadmap & war room',
        body: 'Roadmap holds the saved narrative; war room captures workshop stickies and sketches in the product plan.',
        lookFor: 'Roadmap brief and War room tools in the PM toolbar.',
    },
    {
        title: 'Planning & flow',
        body: 'Planning ties to timelines and CEO flow where available; docs holds product artefacts you link or paste.',
        lookFor: 'Planning map and Docs folder tools.',
    },
];

const ACCOUNTANT: SectionGuideStep[] = [
    {
        title: 'Finance & capital desk',
        body: 'Review runway, burn, funding structure, and CFO-style commentary grounded in your budget and onboarding fields.',
        lookFor: 'Funding ledger blocks and finance summary sections.',
    },
    {
        title: 'Structured funding rows',
        body: 'Edit instrument-aware rows (SAFE, equity, debt, etc.) so reports and chat use consistent numbers.',
        lookFor: 'Tables or chips labelled with funding types and amounts.',
    },
    {
        title: 'Events & signals',
        body: 'Calendar-linked milestones and heuristic flags highlight what might need attention in the next conversation.',
        lookFor: 'Upcoming events strip and insight / bell-style callouts.',
    },
    {
        title: 'Desk chat',
        body: 'Ask the accountant agent for a read on saved figures only — it avoids inventing numbers you have not stored.',
        lookFor: 'Right-hand chat / AI input for this desk.',
    },
];

const SCOUT: SectionGuideStep[] = [
    {
        title: 'Market & growth intelligence',
        body: 'Frame the market, scan competitors, momentum, and opportunity lenses. Results merge into your venture record when you save.',
        lookFor: 'Research topic cards — market lens, competition, momentum, opportunity.',
    },
    {
        title: 'Signal lenses',
        body: 'Narrow scans by industry, funding, policy, or technology so the fetch matches the question you care about.',
        lookFor: 'Lens chips such as industry, funding, policy, technology.',
    },
    {
        title: 'Brief & verification',
        body: 'Copy insights into the brief, verify sources, and rerun scans when your strategy or ICP changes.',
        lookFor: 'Brief editor and refresh / scan actions.',
    },
    {
        title: 'Token use',
        body: 'Live market pulls may consume Dexo tokens on Founder; Pro removes the daily cap.',
        lookFor: 'Cost hints near run or analyze buttons.',
    },
];

const FORGE: SectionGuideStep[] = [
    {
        title: 'Pitch & narrative forge',
        body: 'Build investor-ready narrative blocks and export a slide outline from your saved venture facts.',
        lookFor: 'Section list and slide / export actions in the forge header.',
    },
    {
        title: 'Ground in venture data',
        body: 'Pull quotes and metrics from strategy, product, and finance fields before you export so slides stay truthful.',
        lookFor: 'Insert-from-venture or refresh-from-record controls.',
    },
    {
        title: 'Export',
        body: 'When ready, export decks or copy blocks into an external editor for design polish.',
        lookFor: 'Export or download buttons at the top or bottom of the forge.',
    },
];

const CALENDAR: SectionGuideStep[] = [
    {
        title: 'Calendar',
        body: 'See venture milestones and dated items in one timeline. Add or edit events tied to the active project.',
        lookFor: 'Month or list grid and add-event control.',
    },
    {
        title: 'Link to desks',
        body: 'Dates you set in strategy or product often surface here — keep the calendar aligned after staff sync.',
        lookFor: 'Event titles that mirror phase or ship names.',
    },
];

const REPORTS: SectionGuideStep[] = [
    {
        title: 'Knowledge base',
        body: 'Long-form journal for founder notes and team directives. Both save on the venture for staff sync and Dexo.',
        lookFor: 'Journal and Directives panels with save actions.',
    },
    {
        title: 'Ceremony & focus mode',
        body: 'Expand a writer for distraction-free drafting; use ceremony flows when you want a structured export.',
        lookFor: 'Expand / maximize on a panel and Report ceremony entry.',
    },
];

const DIARY: SectionGuideStep[] = [
    {
        title: 'Neural diary',
        body: 'Capture strategic reflections, tagged entries, and moods. Entries persist on the venture.',
        lookFor: 'Entry list and editor with tags.',
    },
    {
        title: 'Voice capture',
        body: 'Dictate quick notes; review and save so they become searchable context later.',
        lookFor: 'Microphone control on the editor.',
    },
    {
        title: 'Filter & analyse',
        body: 'Filter by tags or run light analysis on selected entries to spot themes.',
        lookFor: 'Tag chips and analysis / sparkles actions.',
    },
];

const SUITE_INTEL: SectionGuideStep[] = [
    {
        title: 'AI team network',
        body: 'Orientation for how desk agents, staff sync, and Dexo relate — use this when onboarding a co-founder or revisiting the stack.',
        lookFor: 'Accordion or section list per role.',
    },
    {
        title: 'Open a desk from here',
        body: 'Many sections link or suggest jumping into CEO, PM, CFO, Scout, or CMO with the right context.',
        lookFor: 'Navigation cues inside each accordion body.',
    },
];

const WARGAME: SectionGuideStep[] = [
    {
        title: 'Wargame Nexus',
        body: 'Run a competitive strategy simulation for one round: define rivals, moves, and see a structured outcome.',
        lookFor: 'Scenario inputs and Run / advance round control.',
    },
    {
        title: 'Save takeaways',
        body: 'Copy conclusions into strategy or scout notes if the exercise surfaces a real risk or opportunity.',
        lookFor: 'Result summary panel after the round.',
    },
];

const VC_GAUNTLET: SectionGuideStep[] = [
    {
        title: 'VC Gauntlet',
        body: 'Stress-test your pitch with adversarial investor-style Q&A grounded in what you have saved.',
        lookFor: 'Prompt or start gauntlet control.',
    },
    {
        title: 'Answer & iterate',
        body: 'Work through questions, refine narrative in the forge, and return until answers feel tight.',
        lookFor: 'Question list and answer field.',
    },
];

const FOUNDERS: SectionGuideStep[] = [
    {
        title: 'Founders office',
        body: 'A focused view of rhythm and energy — use it for deep-work toggles and a calm read on momentum (demo visuals).',
        lookFor: 'Charts and Deep work toggle in the header area.',
    },
];

const ORG: SectionGuideStep[] = [
    {
        title: 'Org structure',
        body: 'When enabled, map roles and reporting lines against your venture. Switch rooms from the main navigator if this view is available.',
        lookFor: 'Org chart or list view.',
    },
];

const DEFAULT: SectionGuideStep[] = [
    {
        title: 'This workspace',
        body: 'You are in a DeepChox room tied to your active venture. Explore panels and use the desk chat or Dexo for AI help.',
        lookFor: 'Left rail to change rooms; bottom bar chat on research desks.',
    },
    {
        title: 'Need orientation?',
        body: 'Reopen this guide anytime from Room guide in the sidebar or Guide on mobile.',
        lookFor: 'Room guide button (desktop rail) or Guide in the mobile header.',
    },
];

export const SECTION_GUIDES: Record<string, SectionGuideStep[]> = {
    dashboard: DASHBOARD,
    dexo: DEXO,
    personal_assistant: DEXO,
    ceo: CEO,
    pm: PM,
    accountant: ACCOUNTANT,
    scout: SCOUT,
    cmo: FORGE,
    forge: FORGE,
    calendar: CALENDAR,
    reports: REPORTS,
    intelligence_diary: DIARY,
    suite_intelligence: SUITE_INTEL,
    wargame: WARGAME,
    vc_gauntlet: VC_GAUNTLET,
    founders_office: FOUNDERS,
    org_structure: ORG,
    __default: DEFAULT,
};

export function getSectionGuideSteps(room: string): SectionGuideStep[] {
    if (room === 'personal_assistant') return SECTION_GUIDES.dexo;
    if (room === 'shark') return SECTION_GUIDES.vc_gauntlet;
    const steps = SECTION_GUIDES[room];
    if (steps?.length) return steps;
    return SECTION_GUIDES.__default;
}
