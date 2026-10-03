#!/usr/bin/env node
/**
 * Downloads the latest yt-dlp standalone binary into ./bin so the
 * Clapfetch link importer can fetch real media from YouTube / TikTok /
 * Instagram / X / Vimeo etc.  Run: `node scripts/setup-ytdlp.mjs`
 * Override the binary location at runtime with the YTDLP_PATH env var.
 */
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/';
const asset =
  process.platform === 'win32' ? 'yt-dlp.exe'
  : process.platform === 'darwin' ? 'yt-dlp_macos'
  : 'yt-dlp_linux';

const binDir = path.resolve(process.cwd(), 'bin');
const target = path.join(binDir, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');

if (fs.existsSync(target) && !process.argv.includes('--force')) {
  console.log(`yt-dlp already present at ${target} (use --force to re-download)`);
  process.exit(0);
}

fs.mkdirSync(binDir, { recursive: true });
console.log(`Downloading ${BASE}${asset} ...`);
const res = await fetch(BASE + asset, { redirect: 'follow' });
if (!res.ok) {
  console.error(`Download failed: HTTP ${res.status}`);
  process.exit(1);
}
const buf = Buffer.from(await res.arrayBuffer());
fs.writeFileSync(target, buf);
if (process.platform !== 'win32') fs.chmodSync(target, 0o755);
console.log(`Saved ${(buf.length / 1048576).toFixed(1)} MB -> ${target}`);
