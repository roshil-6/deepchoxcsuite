import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const f = join(root, 'components', 'Dashboard.tsx');
let c = readFileSync(f, 'utf8');

const fixes = [
    [`style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}`,
     `style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.025)' }}`],
    [`style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.025)' }}`,
     `style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.025)' }}`],
    [`style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#1c1c1f' }}`,
     `style={{ border: '1px solid rgba(255,255,255,0.07)', background: '#1c1c1f' }}`],
    [`style={{ borderColor: 'rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)' }}`,
     `style={{ border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)' }}`],
];

let n = 0;
for (const [from, to] of fixes) {
    const count = c.split(from).length - 1;
    if (count > 0) {
        c = c.split(from).join(to);
        n += count;
        console.log(`✓ (${count}x) ${from.slice(0, 55)}…`);
    }
}

writeFileSync(f, c, 'utf8');
console.log(`\nDone: ${n} replacements.`);
