/**
 * Fix double-encoded UTF-8 (mojibake) strings in source files.
 * Reads each file as UTF-8 and replaces the garbled sequences with correct Unicode.
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Map of garbled → correct character
// These were produced by UTF-8 bytes being interpreted as Windows-1252 then re-encoded as UTF-8
const FIXES = [
    // em dash  U+2014  →  â€" (with right double quote U+201D)
    [/â€"/g,  '—'],
    // ellipsis U+2026  →  â€¦ (with broken bar U+00A6)
    [/â€¦/g,  '…'],
    // middle dot U+00B7 →  Â·
    [/Â·/g,   '·'],
    // bullet U+2022   →  â€¢
    [/â€¢/g,  '•'],
    // right arrow U+2192 → â†'
    [/â†'/g,  '→'],
    // left arrow U+2190 → â†
    [/â†/g,   '←'],
    // en dash U+2013  →  â€"  (note: same pattern as em dash in some contexts)
    // handled above
    // non-breaking space / other common ones
    [/Ã—/g,   '×'],
    [/Ã©/g,   'é'],
];

const FILES = [
    'components/Dexo/DexoRoom.tsx',
    'components/Dashboard.tsx',
    'components/Dexo/FloatingDexoOrb.tsx',
    'components/Dexo/VenturePrioritySelector.tsx',
    'components/IntelligenceDiary.tsx',
    'components/WargameNexus.tsx',
    'components/VCGauntlet.tsx',
    'components/FoundersOffice.tsx',
    'components/Desks/DesksHub.tsx',
];

let totalFixed = 0;

for (const relPath of FILES) {
    const f = join(root, relPath);
    let c;
    try {
        c = readFileSync(f, 'utf8');
    } catch {
        console.log(`  skip (not found): ${relPath}`);
        continue;
    }

    const before = c;
    for (const [pat, rep] of FIXES) {
        c = c.replace(pat, rep);
    }

    if (c !== before) {
        writeFileSync(f, c, 'utf8');
        // Count replacements
        let n = 0;
        for (const [pat] of FIXES) {
            const g = new RegExp(pat.source, 'g');
            n += (before.match(g) || []).length;
        }
        totalFixed += n;
        console.log(`✓ fixed ${n} chars in ${relPath}`);
    } else {
        console.log(`  no changes: ${relPath}`);
    }
}

console.log(`\nDone. ${totalFixed} total replacements.`);
