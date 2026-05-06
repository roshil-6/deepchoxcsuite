import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const f = join(__dirname, '..', 'components', 'Dashboard.tsx');
let c = readFileSync(f, 'utf8');

let changes = 0;

function rep(pattern, replacement, label) {
    const before = c;
    if (typeof pattern === 'string') {
        if (c.includes(pattern)) {
            c = c.replace(pattern, replacement);
            changes++;
            console.log(`✓ ${label}`);
        } else {
            console.log(`✗ NOT FOUND: ${label}`);
        }
    } else {
        // regex
        const m = c.match(pattern);
        if (m) {
            c = c.replace(pattern, replacement);
            changes++;
            console.log(`✓ ${label}`);
        } else {
            console.log(`✗ NOT FOUND: ${label}`);
        }
    }
}

// ── 1. HEADER icon tile → DexoAvatar ────────────────────────────────────────
// Match from the opening <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl"
// inside the header to the end of the <div className="min-w-0"> containing the project name and date
rep(
    /(<div className="flex items-center gap-2 sm:gap-4 min-w-0">)\s*<div\s+className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl"[\s\S]*?<div className="min-w-0">\s*<h1[\s\S]*?<\/h1>\s*<div[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
    `<div className="flex items-center gap-3 min-w-0">
                        <DexoAvatar size="sm" state="idle" pulse={false} />
                        <div className="min-w-0">
                            <h1 className="text-[15px] font-semibold tracking-tight truncate" style={{ color: '#f2f2f5' }}>
                                {activeProject.name}
                            </h1>
                            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
                                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                            </p>
                        </div>
                    </div>`,
    'Header icon tile → DexoAvatar'
);

// ── 2. HEADER action buttons → plain text links ───────────────────────────────
rep(
    /(<div className="flex items-center gap-2">)\s*<button\s+type="button"\s+onClick=\{\(\) => \{ setDexoWelcomeStep\(0\); setShowDexoWelcome\(true\); \}\}[\s\S]*?<WorkspaceAiButton \/>\s*<\/div>/,
    `<div className="flex items-center gap-5">
                        <button
                            type="button"
                            onClick={() => { setDexoWelcomeStep(0); setShowDexoWelcome(true); }}
                            className="text-[12px] transition-opacity hover:opacity-60"
                            style={{ color: 'rgba(255,255,255,0.38)' }}
                        >
                            Guide
                        </button>
                        <button
                            onClick={() => runAgentStaffSync()}
                            disabled={agentSyncRunning}
                            className="flex items-center gap-1.5 text-[12px] transition-opacity hover:opacity-60 disabled:opacity-25"
                            style={{ color: 'rgba(255,255,255,0.38)' }}
                        >
                            <RefreshCw className={\`h-3 w-3 \${agentSyncRunning ? 'animate-spin' : ''}\`} />
                            {agentSyncRunning ? 'Syncing...' : 'Sync'}
                        </button>
                        <WorkspaceAiButton />
                    </div>`,
    'Header action buttons → text links'
);

// ── 3. Research Guide section header icon → DexoAvatar, flatten ──────────────
rep(
    /<div\s+className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"[\s\S]*?<Cpu className="h-4 w-4" style=\{\{ color: THEME\.accent\.primary \}\} \/>\s*<\/div>\s*<div className="min-w-0">\s*<h2 className="text-\[13px\] font-semibold" style=\{\{ color: THEME\.text\.primary \}\}>Dexo Research Guide<\/h2>\s*<p className="truncate text-\[10px\]" style=\{\{ color: THEME\.text\.muted \}\}>/,
    `<DexoAvatar size="xs" state="idle" pulse={false} />
                        <div className="min-w-0">
                            <h2 className="text-[13px] font-semibold" style={{ color: '#f2f2f5' }}>Research Brief</h2>
                            <p className="truncate text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>`,
    'Section header icon → DexoAvatar'
);

// ── 4. Section header wrapper: remove #242428 bg ─────────────────────────────
rep(
    `className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6"\n                                    style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#242428' }}`,
    `className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5"\n                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}`,
    'Section header wrapper flatten'
);

// ── 5. Section header "Full briefing" button → text link ─────────────────────
rep(
    /className="flex items-center gap-1\.5 rounded-xl border px-3 py-2 text-\[11px\] font-semibold transition-all hover:opacity-80"\s+style=\{\{ borderColor: 'rgba\(255,255,255,0\.13\)', background: 'rgba\(255,255,255,0\.07\)', color: THEME\.accent\.primary \}\}\s+>\s*<Sparkles className="h-3\.5 w-3\.5 shrink-0" \/>\s*<span className="hidden sm:inline">Full briefing<\/span>\s*<span className="sm:hidden">Brief<\/span>/,
    `className="text-[11px] font-medium transition-opacity hover:opacity-60"\n                                            style={{ color: 'rgba(255,255,255,0.40)' }}\n                                        >\n                                            Full briefing`,
    'Full briefing button → text link'
);

// ── 6. Section header "Refresh" button → text link ───────────────────────────
rep(
    /className="flex items-center gap-1\.5 rounded-xl border px-3 py-2 text-\[11px\] font-medium transition-all hover:opacity-70"\s+style=\{\{ borderColor: THEME\.border\.default, background: 'rgba\(255,255,255,0\.05\)', color: THEME\.text\.muted, opacity: agentSyncRunning \? 0\.5 : 1 \}\}\s+>\s*<RefreshCw className=\{`h-3 w-3 shrink-0 \$\{agentSyncRunning \? 'animate-spin' : ''\}`\} \/>\s*<span className="hidden sm:inline">\{agentSyncRunning \? 'Syncing[^']*' : 'Refresh'\}<\/span>/,
    `className="flex items-center gap-1.5 text-[11px] transition-opacity hover:opacity-60 disabled:opacity-25"\n                                            style={{ color: 'rgba(255,255,255,0.30)' }}\n                                        >\n                                            <RefreshCw className={\`h-3 w-3 \${agentSyncRunning ? 'animate-spin' : ''}\`} />\n                                            {agentSyncRunning ? 'Syncing...' : 'Refresh'}`,
    'Refresh button → text link'
);

// ── 7. DESK GRID → clean horizontal list ─────────────────────────────────────
// Match from the comment line containing "Desk cards" to the closing </div> of the grid
const deskStart = /\{\/\* Desk cards[^\*]*\*\/\}\s*\n\s*<div className="grid gap-px sm:grid-cols-2"/;
const deskStartMatch = c.match(deskStart);
if (deskStartMatch) {
    const startIdx = c.indexOf(deskStartMatch[0]);
    // Find the closing </div> of the grid - it's after the last map item's </div>
    // The grid div ends before "Executive Synthesis footer"
    const afterGrid = c.indexOf('{/* Executive Synthesis footer', startIdx);
    if (afterGrid > 0) {
        // Walk backward to find the closing </div> of the grid
        let endIdx = afterGrid;
        // Find the last </div> before the Executive Synthesis comment
        const segment = c.slice(startIdx, afterGrid);
        const lastDivClose = segment.lastIndexOf('</div>');
        endIdx = startIdx + lastDivClose + 6; // 6 = length of "</div>"

        const oldBlock = c.slice(startIdx, endIdx);
        const newBlock = `{/* Desk list — clean horizontal rows */}
                                <div className="flex flex-col">
                                    {([
                                        { key: 'ceo',        label: 'Strategic Direction', role: 'CEO',             snap: activeProject.agentStaffSnapshot.desks.ceo,        room: 'ceo'        as const, icon: Lightbulb },
                                        { key: 'scout',      label: 'Market Intelligence', role: 'Scout',           snap: activeProject.agentStaffSnapshot.desks.scout,      room: 'scout'      as const, icon: Globe     },
                                        { key: 'pm',         label: 'Product Insights',    role: 'Product Manager', snap: activeProject.agentStaffSnapshot.desks.pm,         room: 'pm'         as const, icon: Layers    },
                                        { key: 'accountant', label: 'Finance & Runway',    role: 'Accountant',      snap: activeProject.agentStaffSnapshot.desks.accountant, room: 'accountant' as const, icon: Wallet    },
                                        { key: 'cmo',        label: 'Growth & GTM',        role: 'CMO',             snap: activeProject.agentStaffSnapshot.desks.cmo,        room: 'cmo'        as const, icon: Megaphone },
                                    ] as const).map(({ key, label, role, snap, room, icon: DeskIcon }, idx, arr) => {
                                        const hasSnap = !!snap?.trim();
                                        const isLast = idx === arr.length - 1;
                                        return (
                                            <div
                                                key={key}
                                                className="group flex items-start gap-4 py-4 cursor-pointer transition-colors duration-150 -mx-4 sm:-mx-5 px-4 sm:px-5 hover:bg-white/[0.02]"
                                                style={!isLast ? { borderBottom: '1px solid rgba(255,255,255,0.05)' } : {}}
                                                onClick={() => switchRoom(room)}
                                            >
                                                {/* Icon */}
                                                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                                    <DeskIcon className="h-3 w-3" style={{ color: 'rgba(255,255,255,0.35)' }} strokeWidth={1.75} />
                                                </div>

                                                {/* Text */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-baseline gap-2 mb-0.5">
                                                        <span className="text-[13px] font-medium" style={{ color: '#f2f2f5' }}>{label}</span>
                                                        <span className="text-[9px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.20)' }}>{role}</span>
                                                    </div>
                                                    {hasSnap ? (
                                                        <p className="text-[12px] leading-relaxed line-clamp-2" style={{ color: 'rgba(255,255,255,0.38)' }}>
                                                            {snap!.trim()}
                                                        </p>
                                                    ) : (
                                                        <p className="text-[11px] italic" style={{ color: 'rgba(255,255,255,0.18)' }}>No research yet</p>
                                                    )}
                                                </div>

                                                {/* Hover actions */}
                                                <div className="flex shrink-0 items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-150 mt-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={e => { e.stopPropagation(); setOpenGuideKey(key); }}
                                                        className="text-[10px] transition-colors"
                                                        style={{ color: 'rgba(255,255,255,0.30)' }}
                                                    >
                                                        Guide
                                                    </button>
                                                    {hasSnap && (
                                                        <button
                                                            type="button"
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                setDexoBootstrap({
                                                                    title: \`\${label} — \${activeProject.name}\`,
                                                                    detail: snap!.trim(),
                                                                    sourceRole: key as 'ceo'|'pm'|'accountant'|'cmo'|'scout',
                                                                    requiredInfo: [],
                                                                    userMessage: \`I am reviewing the \${label} research for \${activeProject.name}.\\n\\nFinding:\\n"\${snap!.trim().slice(0, 400)}"\\n\\nWhat does this mean and what's the single most important action?\`,
                                                                });
                                                                switchRoom('dexo');
                                                            }}
                                                            className="text-[10px] transition-colors"
                                                            style={{ color: 'rgba(255,255,255,0.30)' }}
                                                        >
                                                            Ask Dexo
                                                        </button>
                                                    )}
                                                    <ChevronRight className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.18)' }} strokeWidth={1.5} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>`;

        c = c.slice(0, startIdx) + newBlock + c.slice(endIdx);
        changes++;
        console.log('✓ Desk grid → horizontal list');
    } else {
        console.log('✗ Could not find Executive Synthesis comment after desk start');
    }
} else {
    console.log('✗ Desk grid start not found');
}

// ── 8. Executive Synthesis label ─────────────────────────────────────────────
rep(
    `<p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: THEME.accent.primary }}>Executive Synthesis</p>`,
    `<p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.30)' }}>Synthesis</p>`,
    'Executive Synthesis label'
);
// Also handle if already partially updated
rep(
    `<p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.30)' }}>Executive Synthesis</p>`,
    `<p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.30)' }}>Synthesis</p>`,
    'Executive Synthesis label (alt)'
);

// ── 9. "Unpack with Dexo" / "Ask Dexo" Synthesis button → text link ──────────
rep(
    /className="shrink-0 flex items-center gap-1\.5 rounded-xl border px-3\.5 py-2 text-\[11px\] font-semibold transition-all hover:opacity-80"\s+style=\{\{ borderColor: 'rgba\(255,255,255,0\.12\)', background: 'rgba\(255,255,255,0\.06\)', color: THEME\.accent\.primary \}\}\s+>\s*<Sparkles className="h-3 w-3 shrink-0" \/>\s*Unpack with Dexo[^<]*/,
    `className="text-[11px] transition-opacity hover:opacity-60"\n                                                style={{ color: 'rgba(255,255,255,0.35)' }}\n                                            >\n                                                Ask Dexo →`,
    'Synthesis Ask Dexo button → text link'
);

// ── 10. EMPTY STATE: Cpu → DexoAvatar ─────────────────────────────────────────
rep(
    /<div\s+className="flex h-14 w-14 items-center justify-center rounded-2xl"\s+style=\{\{ background: 'rgba\(255,255,255,0\.08\)', boxShadow: '0 0 0 1px rgba\(255,255,255,0\.10\)' \}\}\s+>\s*<Cpu className="h-7 w-7" style=\{\{ color: THEME\.accent\.primary \}\} \/>\s*<\/div>\s*<div>\s*<h3 className="text-sm font-semibold" style=\{\{ color: THEME\.text\.primary \}\}>Dexo Research Guide<\/h3>\s*<p className="mt-0\.5 text-\[10px\]" style=\{\{ color: THEME\.text\.muted \}\}>Run Staff Sync to activate all 5 desks<\/p>\s*<\/div>\s*<button\s+onClick=\{\(\) => runAgentStaffSync\(\)\}\s+disabled=\{agentSyncRunning\}\s+className="flex items-center gap-2 rounded-xl border px-6 py-2\.5 text-sm font-semibold transition-all active:scale-\[0\.98\]"\s+style=\{\{ borderColor: 'rgba\(116,86,255,0\.3\)', background: 'rgba\(255,255,255,0\.07\)', color: THEME\.accent\.primary, opacity: agentSyncRunning \? 0\.6 : 1 \}\}\s+>\s*<RefreshCw className=\{`h-4 w-4 shrink-0 \$\{agentSyncRunning \? 'animate-spin' : ''\}`\} \/>\s*\{agentSyncRunning \? 'Analysin[^']+'[^}]+\}/,
    `<DexoAvatar size="lg" state="idle" pulse={false} />
                                <div>
                                    <h3 className="text-[14px] font-semibold" style={{ color: '#f2f2f5' }}>No research yet</h3>
                                    <p className="mt-0.5 text-[12px]" style={{ color: 'rgba(255,255,255,0.30)' }}>Run Staff Sync to activate all 5 desks</p>
                                </div>
                                <button
                                    onClick={() => runAgentStaffSync()}
                                    disabled={agentSyncRunning}
                                    className="flex items-center gap-2 text-[13px] font-medium transition-opacity hover:opacity-70 disabled:opacity-30"
                                    style={{ color: 'rgba(255,255,255,0.55)' }}
                                >
                                    <RefreshCw className={\`h-3.5 w-3.5 \${agentSyncRunning ? 'animate-spin' : ''}\`} />
                                    {agentSyncRunning ? 'Analysing...' : 'Run Staff Sync'}`,
    'Empty state Cpu → DexoAvatar'
);

// ── 11. Guide popup title ─────────────────────────────────────────────────────
rep(
    `<p className="text-[13px] font-semibold" style={{ color: THEME.text.primary }}>Dexo Co-Founder Guide</p>`,
    `<p className="text-[13px] font-semibold" style={{ color: '#f2f2f5' }}>Dexo Guide</p>`,
    'Guide popup title'
);

// ── 12. KPI strip: remove heavy rounded-2xl border box ───────────────────────
rep(
    `className="grid grid-cols-2 divide-x overflow-hidden rounded-2xl border lg:grid-cols-4"\n                            style={{ borderColor: THEME.border.subtle, background: 'rgba(255,255,255,0.03)' }}`,
    `className="grid grid-cols-2 divide-x overflow-hidden rounded-xl lg:grid-cols-4"\n                            style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}`,
    'KPI strip border flatten'
);

writeFileSync(f, c, 'utf8');
console.log(`\nDone. ${changes} replacements applied.`);
