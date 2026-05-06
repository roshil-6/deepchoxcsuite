import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const FILES = [
    'components/Dashboard.tsx',
    'components/Dexo/DexoRoom.tsx',
    'components/Sidebar.tsx',
    'components/Trivily.tsx',
];

// Smart quotes → straight ASCII quotes
const FIXES = [
    ['‘', "'"],  // left single quotation mark → straight apostrophe
    ['’', "'"],  // right single quotation mark → straight apostrophe
    ['“', '"'],  // left double quotation mark → straight double quote
    ['”', '"'],  // right double quotation mark → straight double quote
];

let total = 0;
for (const rel of FILES) {
    const fullPath = join(root, rel);
    let c;
    try { c = readFileSync(fullPath, 'utf8'); } catch { console.log(`skip: ${rel}`); continue; }
    const before = c;
    for (const [bad, good] of FIXES) {
        c = c.split(bad).join(good);
    }
    const fixed = before.split('').filter((ch, i) => ch !== c[i]).length;
    if (fixed > 0) {
        writeFileSync(fullPath, c, 'utf8');
        console.log(`✓ fixed ${fixed} smart quotes in ${rel}`);
        total += fixed;
    } else {
        console.log(`  clean: ${rel}`);
    }
}
console.log(`\nDone. Total fixed: ${total}`);
