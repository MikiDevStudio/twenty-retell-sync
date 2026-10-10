// Renders the marketplace images into public/: logo, cover (banner padded to 8:5) and the gallery pages.
// Run: node design/gallery/render.mjs   (needs Chrome; sharp comes with twenty-sdk)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const out = join(root, 'public/gallery');
mkdirSync(out, { recursive: true });

// Logo: the square source downscaled; Twenty shows it at 40-80 px.
await sharp(join(root, 'design/source/logo.png')).resize(512, 512).png({ compressionLevel: 9 }).toFile(join(root, 'public/logo.png'));

// Cover: the 16:9 banner centred on a blurred copy of itself, so the 8:5 frame has no empty bands.
const banner = join(root, 'design/source/banner.png');
const W = 1600, H = 1000;
const back = await sharp(banner).resize(W, H, { fit: 'cover' }).blur(40).modulate({ brightness: 0.7 }).toBuffer();
const meta = await sharp(banner).metadata();
const frontH = Math.round((W * meta.height) / meta.width);
// Feather the top and bottom edges so the banner melts into the blurred bands.
const fade = Buffer.from(`<svg width="${W}" height="${frontH}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.08" stop-color="#fff"/>
  <stop offset="0.92" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/></svg>`);
const front = await sharp(banner).resize(W, frontH).ensureAlpha()
  .composite([{ input: fade, blend: 'dest-in' }]).png().toBuffer();
await sharp(back).composite([{ input: front, top: Math.round((H - frontH) / 2), left: 0 }]).png({ compressionLevel: 9 }).toFile(join(out, '01-cover.png'));

const chrome = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
].find(existsSync);
const pages = readdirSync(here).filter((f) => /^\d\d-.*\.html$/.test(f));
for (const page of pages) {
  const raw = join(out, page.replace('.html', '.raw.png'));
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--virtual-time-budget=4000', `--window-size=${W},${H}`, `--screenshot=${raw}`, pathToFileURL(join(here, page)).href]);
  await sharp(raw).png({ compressionLevel: 9 }).toFile(join(out, page.replace('.html', '.png')));
  (await import('node:fs')).rmSync(raw);
}
console.log('rendered', pages.length + 1, 'gallery images');
