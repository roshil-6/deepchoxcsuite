import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Exact mojibake byte sequences (from file inspection):
// em dash U+2014 double-encoded → U+00E2 U+20AC U+201D
const EM  = String.fromCharCode(0x00e2, 0x20ac, 0x201d);
// ellipsis U+2026 → U+00E2 U+20AC U+00A6
const EL  = String.fromCharCode(0x00e2, 0x20ac, 0x00a6);
// middle dot U+00B7 → U+00C2 U+00B7
const MD  = String.fromCharCode(0x00c2, 0x00b7);
// bullet U+2022 → U+00E2 U+20AC U+00A2
const BUL = String.fromCharCode(0x00e2, 0x20ac, 0x00a2);
// right arrow U+2192 → U+00E2 U+2020 U+2019
const ARR = String.fromCharCode(0x00e2, 0x2020, 0x2019);

const FIXES = [
    [EM,  '—'],
    [EL,  '…'],
    [MD,  '·'],
    [BUL, '•'],
    [ARR, '→'],
];

const FILES = [
    'components/Dexo/DexoRoom.tsx',
    'components/Dashboard.tsx',
    'components/Dexo/FloatingDexoOrb.tsx',
    'components/WargameNexus.tsx',
    'components/Desks/DesksHub.tsx',
    'components/IntelligenceDiary.tsx',
    'components/FoundersOffice.tsx',
    'components/VCGauntlet.tsx',
    'components/PitchDeckForge.tsx',
    'components/DexoResearchRoom.tsx',
];

let totalFiles = 0;
let totalFixes = 0;

for (const rel of FILES) {
    const fullPath = join(root, rel);
    let c;
    try {
        c = readFileSync(fullPath, 'utf8');
    } catch (err) {
        console.log(`  skip (${err.code}): ${rel}`);
        continue;
    }

    const before = c;
    let n = 0;
    for (const [bad, good] of FIXES) {
        const count = c.split(bad).length - 1;
        if (count > 0) {
            c = c.split(bad).join(good);
            n += count;
        }
    }

    if (n > 0) {
        writeFileSync(fullPath, c, 'utf8');
        console.log(`✓ fixed ${n} occurrences in ${rel}`);
        totalFiles++;
        totalFixes += n;
    } else {
        console.log(`  no mojibake: ${rel}`);
    }
}

console.log(`\nDone. Fixed ${totalFixes} occurrences across ${totalFiles} files.`);
