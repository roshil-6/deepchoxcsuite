/**
 * Comprehensive Dashboard design upgrade
 * - Resolves all THEME.* CSS-var references to direct Perplexity-palette values
 * - Flattens rounded-2xl border boxes → rounded-xl with hairline borders
 * - Fixes purple remnants, improves typography hierarchy, neutralises desk coverage colors
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const f = join(root, 'components', 'Dashboard.tsx');
let c = readFileSync(f, 'utf8');

let n = 0;
function rep(from, to, label) {
    const before = c;
    if (from instanceof RegExp) {
        c = c.replace(from, to);
    } else {
        c = c.split(from).join(to);
    }
    const count = (before.split(typeof from === 'string' ? from : '').length - 1) || (before !== c ? 1 : 0);
    if (c !== before) {
        n++;
        console.log(`✓ ${label}`);
    } else {
        console.log(`  skip: ${label}`);
    }
}

// ── 1. RESOLVE THEME TEXT VARIABLES ─────────────────────────────────────────
// Primary text (#f2f2f5)
rep(/THEME\.text\.primary/g,   "'#f2f2f5'",           'THEME.text.primary');
// Secondary (#8c8c9e → slightly lighter for readability)
rep(/THEME\.text\.secondary/g, "'rgba(255,255,255,0.55)'", 'THEME.text.secondary');
// Tertiary (#5c5c6e)
rep(/THEME\.text\.tertiary/g,  "'rgba(255,255,255,0.35)'", 'THEME.text.tertiary');
// Muted (#3d3d4e → much too dark, upgrade to visible)
rep(/THEME\.text\.muted/g,     "'rgba(255,255,255,0.30)'", 'THEME.text.muted');

// ── 2. RESOLVE THEME ACCENT VARIABLES ───────────────────────────────────────
rep(/THEME\.accent\.primary/g,   "'rgba(255,255,255,0.75)'", 'THEME.accent.primary');
rep(/THEME\.accent\.secondary/g, "'rgba(255,255,255,0.55)'", 'THEME.accent.secondary');
rep(/THEME\.accent\.tertiary/g,  "'rgba(255,255,255,0.45)'", 'THEME.accent.tertiary');
rep(/THEME\.accent\.info/g,      "'rgba(255,255,255,0.38)'", 'THEME.accent.info');
rep(/THEME\.accent\.warning/g,   "'rgba(255,255,255,0.28)'", 'THEME.accent.warning');

// ── 3. RESOLVE THEME BORDER VARIABLES ───────────────────────────────────────
rep(/THEME\.border\.subtle/g,  "'rgba(255,255,255,0.06)'", 'THEME.border.subtle');
rep(/THEME\.border\.default/g, "'rgba(255,255,255,0.09)'", 'THEME.border.default');
rep(/THEME\.border\.strong/g,  "'rgba(255,255,255,0.13)'", 'THEME.border.strong');

// ── 4. FLATTEN rounded-2xl border CARDS → rounded-xl ────────────────────────
// Pattern: className="... rounded-2xl border ..."
rep(/rounded-2xl border\b/g, 'rounded-xl', 'flatten rounded-2xl border');

// Also: className="overflow-hidden rounded-xl border" (section wrappers)
// Keep as-is but flatten border color via global THEME replace above

// ── 5. FIX PURPLE REMNANTS ──────────────────────────────────────────────────
// Purple border on "Open Dexo AI" button
rep(
    `borderColor: 'rgba(116,86,255,0.3)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.75)'`,
    `background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.65)'`,
    'Fix Open Dexo AI purple border'
);
// Any remaining rgba(116,86,255 → neutral
rep(/rgba\(116,86,255[^)]*\)/g, 'rgba(255,255,255,0.15)', 'Remaining purple rgba');
rep(/rgba\(124,58,237[^)]*\)/g, 'rgba(255,255,255,0.15)', 'Old violet rgba');

// ── 6. FIX DESK COVERAGE PROGRESS BAR COLORS ────────────────────────────────
// progress bar fill: desk.fill when not 100%
rep(
    `background: desk.pct === 100 ? 'rgba(255,255,255,0.75)' : desk.fill`,
    `background: 'rgba(255,255,255,0.45)'`,
    'Desk coverage progress bar neutral'
);

// ── 7. KPI STRIP — bigger value font, cleaner label ─────────────────────────
// Make value number larger
rep(
    `className="mt-0.5 text-lg font-semibold leading-none tabular-nums"`,
    `className="mt-0.5 text-[22px] font-semibold leading-none tabular-nums tracking-tight"`,
    'KPI value font-size'
);
// Make KPI label all-caps a bit smaller and dimmer
rep(
    `className="text-[10px] font-medium uppercase tracking-[0.12em]"`,
    `className="text-[9px] font-medium uppercase tracking-[0.18em]"`,
    'KPI label tracking'
);
// KPI icon background: remove icon badge bg (cleaner)
rep(
    /className="mt-0\.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"\s+style=\{\{ background: `\$\{accent\}14` \}\}/,
    `className="mt-0.5 shrink-0"`,
    'KPI icon – remove badge bg'
);
rep(
    /<Icon className="h-4 w-4" style=\{\{ color: accent \}\} \/>/,
    `<Icon className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.25)' }} />`,
    'KPI icon color dim'
);

// ── 8. SECTION LABEL TYPOGRAPHY — unified style ──────────────────────────────
// All "text-[10px] font-semibold uppercase tracking-[0.14em]" section headers
rep(
    /className="mb-3 text-\[10px\] font-semibold uppercase tracking-\[0\.14em\]"/g,
    `className="mb-3 text-[9px] font-semibold uppercase tracking-[0.20em]"`,
    'Section label tracking upgrade'
);
rep(
    /className="mb-2 font-mono text-\[9px\] uppercase tracking-\[0\.18em\]"/g,
    `className="mb-2 text-[9px] font-medium uppercase tracking-[0.20em]"`,
    'Mono section label → normal'
);
rep(
    /className="font-mono text-\[9px\] uppercase tracking-\[0\.18em\]"/g,
    `className="text-[9px] font-medium uppercase tracking-[0.20em]"`,
    'Mono section label → normal (no mb)'
);
rep(
    /className="mb-1\.5 font-mono text-\[9px\] uppercase tracking-\[0\.18em\]"/g,
    `className="mb-1.5 text-[9px] font-medium uppercase tracking-[0.20em]"`,
    'Mono section label mb-1.5 → normal'
);

// ── 9. VENTURE CONTEXT + COMMAND CENTER BOXES — flatten borders ──────────────
// Venture context: flex flex-col gap-4 overflow-hidden rounded-xl border p-5
rep(
    `className="flex flex-col gap-4 overflow-hidden rounded-xl border p-5"\n                                style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}`,
    `className="flex flex-col gap-4 p-4 sm:p-5 rounded-xl"\n                                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}`,
    'Venture context card flatten'
);
// Health ring card
rep(
    `className="flex items-center gap-4 rounded-xl border p-5"\n                                    style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}`,
    `className="flex items-center gap-4 rounded-xl p-4"\n                                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}`,
    'Health ring card flatten'
);
// Desk coverage card
rep(
    `className="flex-1 rounded-xl border p-5"\n                                    style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}`,
    `className="flex-1 rounded-xl p-4"\n                                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}`,
    'Desk coverage card flatten'
);

// ── 10. OPERATIONS ROW CARDS — flatten all p-5 bordered boxes ────────────────
rep(/className="rounded-xl border p-5"\s+style=\{\{ borderColor: 'rgba\(255,255,255,0\.06\)', background: 'rgba\(255,255,255,0\.02\)' \}\}/g,
    `className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}`,
    'Operations cards flatten'
);

// ── 11. DELIVERY BOARD INNER CELLS ───────────────────────────────────────────
rep(
    `className="rounded-xl border px-3 py-2.5 text-center"\n                                                    style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.04)' }}`,
    `className="rounded-lg px-3 py-2.5 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}`,
    'Delivery board cells flatten'
);

// ── 12. RESEARCH CONTEXT BUTTON — flatten ────────────────────────────────────
rep(
    `className="shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition hover:opacity-80"\n                                        style={{ borderColor: 'rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.05)', color: '#f2f2f5' }}`,
    `className="shrink-0 text-[11px] font-medium transition-opacity hover:opacity-60" style={{ color: 'rgba(255,255,255,0.40)' }}`,
    'Research context Change button → text link'
);

// ── 13. "Open Dexo AI" button — clean text link ──────────────────────────────
rep(
    `className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border py-2 text-[12px] font-semibold transition-all hover:opacity-80"`,
    `className="mt-4 flex w-full items-center justify-center gap-1.5 py-2 text-[12px] font-medium transition-opacity hover:opacity-60"`,
    'Open Dexo AI button → text link'
);
rep(
    `style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.65)' }}`,
    `style={{ color: 'rgba(255,255,255,0.40)' }}`,
    'Open Dexo AI style → minimal'
);

// ── 14. LIVING OFFICE "Focus" inner card — flatten ───────────────────────────
rep(
    `className="mt-3 rounded-xl border px-3 py-2.5" style={{ borderColor: 'rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)' }}`,
    `className="mt-3 border-l-2 pl-3" style={{ borderColor: 'rgba(255,255,255,0.15)' }}`,
    'Living office focus inner card flatten'
);

// ── 15. ATTENTION PENDING "Ask Dexo" hover text ──────────────────────────────
// fix the ← arrow to →
rep(
    `style={{ color: '#94a3b8' }}>\n                                                                                                                                                                            Ask Dexo ←'`,
    `style={{ color: 'rgba(255,255,255,0.28)' }}>\n                                                                                                                                                                            Ask Dexo →`,
    'Attention Ask Dexo arrow'
);

// ── 16. UPCOMING "View all" + "Open PM" text link colors ────────────────────
rep(
    `style={{ color: 'rgba(255,255,255,0.38)' }}>View all ←'`,
    `style={{ color: 'rgba(255,255,255,0.30)' }}>View all →`,
    'Upcoming view all arrow'
);
rep(
    `style={{ color: 'rgba(255,255,255,0.38)' }}>Open PM ←'`,
    `style={{ color: 'rgba(255,255,255,0.30)' }}>Open PM →`,
    'Open PM arrow'
);

// ── 17. RESEARCH FOCUS dot bullet → neutral ──────────────────────────────────
rep(
    `style={{ background: 'rgba(255,255,255,0.75)' }} />`,
    `style={{ background: 'rgba(255,255,255,0.30)' }} />`,
    'Research focus bullet neutral'
);

// ── 18. RECENT ACTIVITY dot: first item highlight ────────────────────────────
rep(
    `style={{ background: i === 0 ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.30)' }}`,
    `style={{ background: 'rgba(255,255,255,0.25)' }}`,
    'Activity dot uniform'
);

// ── 19. CIRCULARPROGRESSBAR — always neutral white ───────────────────────────
rep(
    /color=\{executionScore > 70 \? 'rgba\(255,255,255,0\.75\)' : executionScore > 40 \? 'rgba\(255,255,255,0\.45\)' : 'rgba\(255,255,255,0\.45\)'\}/,
    `color="rgba(255,255,255,0.55)"`,
    'CircularProgress neutral color'
);

// ── 20. PHASE ROWS (phases tab) — keep them clean ───────────────────────────
// "Planned" fill is THEME.chart.slate already neutral
// No action needed

writeFileSync(f, c, 'utf8');
console.log(`\nDone. ${n} categories of changes applied.`);
