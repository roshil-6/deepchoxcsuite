/**
 * Parse the venture budget / ledger free-text into CFO “expected funding” rows.
 * Encourage labeled lines — see FUNDING_LEDGER_TEMPLATE and buildFundingLedgerTemplate().
 */

export type FundingSectionSpec = {
    id: string;
    label: string;
    shortHint: string;
    /** First capture group = value; line is trimmed and leading bullets stripped */
    patterns: RegExp[];
};

export const FUNDING_SECTION_SPECS: FundingSectionSpec[] = [
    {
        id: 'total_capital',
        label: 'Total capital needed',
        shortHint: 'Build + runway this venture requires',
        patterns: [
            /^(?:total\s+capital|capital\s+needed|funding\s+needed|funding\s+required|raise\s+target|amount\s+to\s+raise|total\s+raise)[^:]*[:\\-–—]\s*(.+)$/i,
        ],
    },
    {
        id: 'secured',
        label: 'Secured / committed',
        shortHint: 'Cash or commitments already in',
        patterns: [
            /^(?:already\s+secured|already\s+committed)[^:]*[:\\-–—]\s*(.+)$/i,
            /^(?:secured|committed|already\s+(?:raised|funded|closed)|closed\s+round)[^:]*[:\\-–—]\s*(.+)$/i,
        ],
    },
    {
        id: 'pre_launch',
        label: 'Pre-launch & setup',
        shortHint: 'Legal, incorporation, early tools',
        patterns: [
            /^(?:pre[-\s]?launch|setup|incorporation)[^:]*[:\\-–—]\s*(.+)$/i,
            /^(?:legal\s*(?:&|and)?\s*admin)[^:]*[:\\-–—]\s*(.+)$/i,
        ],
    },
    {
        id: 'product_build',
        label: 'Product & engineering',
        shortHint: 'Through MVP or next milestone',
        patterns: [
            /^(?:product\s*(?:&|and)?\s*engineering|engineering|development|mvp|build\s+cost)[^:]*[:\\-–—]\s*(.+)$/i,
        ],
    },
    {
        id: 'gtm',
        label: 'Go-to-market',
        shortHint: 'Launch, marketing, first sales motion',
        patterns: [
            /^(?:go[-\s]?to[-\s]?market|gtm|marketing|launch\s+cost|sales\s+motion)[^:]*[:\\-–—]\s*(.+)$/i,
        ],
    },
    {
        id: 'monthly_burn',
        label: 'Monthly burn',
        shortHint: 'Cash out per month (steady state)',
        patterns: [
            /^(?:monthly\s+cash\s+burn|monthly\s+burn|burn\s+rate|opex\s+per\s+month|cash\s+burn)[^:]*[:\\-–—]\s*(.+)$/i,
        ],
    },
    {
        id: 'runway_months',
        label: 'Runway (months)',
        shortHint: 'Months this capital should cover',
        patterns: [
            /^(?:months?\s+of\s+runway|months?\s+this\s+raise)[^:]*[:\\-–—]\s*(.+)$/i,
            /^(?:runway|target\s+runway)[^:]*[:\\-–—]\s*(.+)$/i,
        ],
    },
    {
        id: 'team_people',
        label: 'Team & people',
        shortHint: 'Salaries, contractors, recruiters',
        patterns: [
            /^(?:team|people|payroll|headcount|salaries)[^:]*[:\\-–—]\s*(.+)$/i,
        ],
    },
    {
        id: 'infra',
        label: 'Infra & tools',
        shortHint: 'Cloud, software, hardware',
        patterns: [
            /^(?:infra|infrastructure|cloud|tools|software\s+subscriptions)[^:]*[:\\-–—]\s*(.+)$/i,
        ],
    },
    {
        id: 'contingency',
        label: 'Contingency / buffer',
        shortHint: 'Reserve for unknowns',
        patterns: [/^(?:contingency|buffer|reserve)[^:]*[:\\-–—]\s*(.+)$/i],
    },
    {
        id: 'notes',
        label: 'Notes & offsets',
        shortHint: 'Revenue, grants, non-dilutive',
        patterns: [
            /^(?:notes|offsets|revenue\s+offset|grants|non[-\s]?dilutive)[^:]*[:\\-–—]\s*(.+)$/i,
        ],
    },
];

function normalizeLines(text: string): string[] {
    return (text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

function clip(s: string, max = 240): string {
    const t = s.trim();
    if (t.length <= max) return t;
    return `${t.slice(0, max - 1)}…`;
}

function extractSectionValue(lines: string[], spec: FundingSectionSpec): string | null {
    for (const line of lines) {
        const stripped = line.replace(/^[-*•\d.)\s]+/, '').trim();
        for (const p of spec.patterns) {
            const m = stripped.match(p);
            if (m?.[1]?.trim()) return clip(m[1].trim());
        }
    }
    return null;
}

export type ParsedFundingRow = {
    spec: FundingSectionSpec;
    value: string | null;
};

export function parseFundingLedger(budgetText: string): ParsedFundingRow[] {
    const lines = normalizeLines(budgetText);
    return FUNDING_SECTION_SPECS.map((spec) => ({
        spec,
        value: extractSectionValue(lines, spec),
    }));
}

export function countFilledFundingRows(rows: ParsedFundingRow[]): number {
    return rows.filter((r) => r.value).length;
}

/** Suggested ledger layout — paste into venture budget field (CFO desk editor). */
export function buildFundingLedgerTemplate(ventureName: string): string {
    const name = ventureName.trim() || 'This venture';
    return buildLedgerTextFromFundingValues(name, {});
}

/** Keys match `FUNDING_SECTION_SPECS[].id` — use for AI JSON and merges. */
export const FUNDING_VALUE_KEYS = [
    'total_capital',
    'secured',
    'pre_launch',
    'product_build',
    'gtm',
    'monthly_burn',
    'runway_months',
    'team_people',
    'infra',
    'contingency',
    'notes',
] as const;

export type FundingValueKey = (typeof FUNDING_VALUE_KEYS)[number];

/**
 * Builds ledger text that `parseFundingLedger` understands — same line labels as the empty template.
 * Pass partial `values` to fill only some rows (strings trimmed; empty = blank after colon).
 */
export function buildLedgerTextFromFundingValues(
    ventureName: string,
    values: Partial<Record<FundingValueKey, string>>
): string {
    const name = ventureName.trim() || 'This venture';
    const v = (k: FundingValueKey) => (values[k] ?? '').trim();

    return `# Expected funding — ${name}

Total capital needed (build + initial runway): ${v('total_capital')}
Already secured / committed: ${v('secured')}
Pre-launch & setup (legal, tools, early hires): ${v('pre_launch')}
Product & engineering (through MVP): ${v('product_build')}
Go-to-market (launch, marketing, first revenue): ${v('gtm')}
Monthly cash burn (steady state): ${v('monthly_burn')}
Months of runway this raise should cover: ${v('runway_months')}
Team & payroll (summary): ${v('team_people')}
Infra, cloud & tools: ${v('infra')}
Contingency / buffer: ${v('contingency')}
Notes (revenue offsetting cost, grants, other capital): ${v('notes')}
`;
}

/** Merge: saved parsed values win; AI fills gaps. */
export function mergeFundingValueRows(
    parsed: Partial<Record<FundingValueKey, string>>,
    ai: Partial<Record<FundingValueKey, string>>
): Record<FundingValueKey, string> {
    const out = {} as Record<FundingValueKey, string>;
    for (const k of FUNDING_VALUE_KEYS) {
        const p = parsed[k]?.trim();
        const a = ai[k]?.trim();
        out[k] = p || a || '';
    }
    return out;
}
