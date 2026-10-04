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
const isLinux = process.platform === 'linux' || process.argv.includes('--linux');
const isWin = process.platform === 'win32' && !process.argv.includes('--linux');
const isMac = process.platform === 'darwin' && !process.argv.includes('--linux');

const asset =
  isWin ? 'yt-dlp.exe'
  : isMac ? 'yt-dlp_macos'
  : process.arch === 'arm64' ? 'yt-dlp_linux_aarch64'
  : 'yt-dlp_linux';

const binDir = path.resolve(process.cwd(), 'bin');
const target = path.join(binDir, isWin ? 'yt-dlp.exe' : 'yt-dlp');

if (fs.existsSync(target) && !process.argv.includes('--force')) {
  try {
    const stat = fs.statSync(target);
    if (stat.size > 5_000_000) {
      console.log(`yt-dlp already present at ${target} (${(stat.size / 1048576).toFixed(1)} MB)`);
      process.exit(0);
    }
  } catch {}
}

fs.mkdirSync(binDir, { recursive: true });
console.log(`Downloading ${BASE}${asset} ...`);
const res = await fetch(BASE + asset, {
  redirect: 'follow',
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; DeepChox/1.0; +https://deepchox.com)',
  },
});
if (!res.ok) {
  console.error(`Download failed: HTTP ${res.status}`);
  process.exit(1);
}
const buf = Buffer.from(await res.arrayBuffer());
if (buf.length < 5_000_000) {
  console.error(`Downloaded file too small (${buf.length} bytes), aborting.`);
  process.exit(1);
}
fs.writeFileSync(target, buf);
if (!isWin) {
  try {
    fs.chmodSync(target, 0o755);
  } catch {}
}
console.log(`Saved ${(buf.length / 1048576).toFixed(1)} MB -> ${target}`);
