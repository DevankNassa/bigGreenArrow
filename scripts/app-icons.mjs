#!/usr/bin/env node
/**
 * Renders the app icons from the "Live icon · one per arrow state" board on
 * the design canvas into assets/app-icons/. Needs `rsvg-convert` (librsvg).
 *
 *   node scripts/app-icons.mjs
 *
 * For each icon it writes:
 * - <name>.png             1024×1024, opaque, full bleed (iOS rounds the corners)
 * - <name>-foreground.png  1024×1024 Android adaptive foreground, transparent,
 *                          artwork shrunk into the safe zone
 *
 * The PNGs are committed, so builds don't need this script.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const OUT = resolve(import.meta.dirname, '../assets/app-icons');
const BLOCK = '#111111';

const ARROW = (color) =>
  `<g fill="${color}" stroke="${color}" stroke-linecap="round" stroke-linejoin="round">` +
  `<line x1="18" y1="60" x2="74" y2="60" stroke-width="26"/>` +
  `<path d="M66 28 L104 60 L66 92 Z" stroke-width="16"/></g>`;

const place = (y, angle) => `translate(60 ${y}) scale(0.58) rotate(${angle}) translate(-60 -60)`;

/** An arrow with its darker lip under it. `angle` is SVG rotation: 90 points down. */
const arrow = ({ y, angle, color, shade }) =>
  `<g transform="${place(y + 4, angle)}">${ARROW(shade)}</g><g transform="${place(y, angle)}">${ARROW(color)}</g>`;

const FIRE =
  `<g transform="translate(29 2) scale(0.52)">` +
  `<path d="M60 4 C70 30 100 48 98 88 C97 116 80 136 60 136 C40 136 23 116 22 88 C21 64 36 52 40 34 C46 46 46 56 50 60 C54 42 50 22 60 4 Z" fill="#FF5A1F"/>` +
  `<path d="M60 36 C66 56 86 68 84 96 C83 118 73 130 60 130 C47 130 37 118 36 98 C35 80 47 72 49 58 C53 68 53 76 55 80 C59 66 57 52 60 36 Z" fill="#FF9F1C"/>` +
  `<path d="M60 70 C64 84 76 92 74 108 C73 120 67 128 60 128 C53 128 47 120 46 108 C45 96 54 90 55 80 C57 86 57 90 58 92 C61 84 59 78 60 70 Z" fill="#FFE066"/>` +
  `</g>`;

const WARN =
  `<path d="M26 10 L44 42 L8 42 Z" fill="#FACC15" stroke="#FACC15" stroke-width="5" stroke-linejoin="round"/>` +
  `<line x1="26" y1="21" x2="26" y2="31" stroke="#111111" stroke-width="5" stroke-linecap="round"/>` +
  `<circle cx="26" cy="37.5" r="2.8" fill="#111111"/>`;

const STOP =
  `<polygon points="40.8,19.9 32.1,11.2 19.9,11.2 11.2,19.9 11.2,32.1 19.9,40.8 32.1,40.8 40.8,32.1" fill="#EF4444" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round"/>` +
  `<rect x="17" y="23.5" width="18" height="5" rx="2.5" fill="#FFFFFF"/>`;

const HOURGLASS =
  `<rect x="34" y="22" width="52" height="8" rx="4" fill="#9CA3AF"/>` +
  `<rect x="34" y="90" width="52" height="8" rx="4" fill="#9CA3AF"/>` +
  `<path d="M40 30 C40 50 56 54 56 60 C56 66 40 70 40 90 L80 90 C80 70 64 66 64 60 C64 54 80 50 80 30 Z" fill="none" stroke="#9CA3AF" stroke-width="5" stroke-linejoin="round"/>` +
  `<path d="M47 37 L73 37 C73 46 64 51 60 55 C56 51 47 46 47 37 Z" fill="#FACC15"/>` +
  `<line x1="60" y1="57" x2="60" y2="84" stroke="#FACC15" stroke-width="3" stroke-linecap="round" stroke-dasharray="4 5"/>` +
  `<path d="M47 87 C51 78 69 78 73 87 Z" fill="#FACC15"/>`;

/** Mirrors the fire top to bottom, for the "up" variants. */
const flip = (svg) => `<g transform="translate(0 120) scale(1 -1)">${svg}</g>`;

/**
 * Each icon from the design, pointing down, with `up` saying how to point it
 * up: the arrow is mirrored by hand so its lip stays underneath, and `upY`
 * leaves room for a corner badge.
 */
const DIRECTIONAL = {
  optimal: { arrow: { y: 74, angle: 90, color: '#22C55E', shade: '#15803D' }, fire: true },
  'too-fast': { arrow: { y: 64, angle: 90, color: '#F97316', shade: '#C2410C' }, badge: WARN, upY: 70 },
  slow: { arrow: { y: 60, angle: 40, color: '#86D9A3', shade: '#4FAE70' } },
  drifting: { arrow: { y: 60, angle: 40, color: '#F2A3A3', shade: '#C46A6A' } },
  'wrong-way': { arrow: { y: 64, angle: 90, color: '#EF4444', shade: '#B91C1C' }, badge: STOP, upY: 70 },
};

const ICONS = {
  calibrating: HOURGLASS,
  steady: arrow({ y: 60, angle: 0, color: '#9CA3AF', shade: '#6B7280' }),
  'on-target': arrow({ y: 60, angle: 0, color: '#22C55E', shade: '#15803D' }),
};
for (const [name, { arrow: a, fire, badge = '', upY }] of Object.entries(DIRECTIONAL)) {
  ICONS[`${name}-down`] = (fire ? FIRE : '') + arrow(a) + badge;
  ICONS[`${name}-up`] =
    (fire ? flip(FIRE) : '') + arrow({ ...a, y: upY ?? 120 - a.y, angle: -a.angle }) + badge;
}

const svg = (inner, { background, scale = 1 }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="1024" height="1024">` +
  (background ? `<rect width="120" height="120" fill="${background}"/>` : '') +
  `<g transform="translate(60 60) scale(${scale}) translate(-60 -60)">${inner}</g></svg>`;

mkdirSync(OUT, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'app-icons-'));
function render(name, source) {
  const file = join(tmp, `${name}.svg`);
  writeFileSync(file, source);
  execFileSync('rsvg-convert', ['-w', '1024', '-h', '1024', '-o', join(OUT, `${name}.png`), file]);
}

for (const [name, inner] of Object.entries(ICONS)) {
  render(name, svg(inner, { background: BLOCK }));
  // Android masks adaptive icons to the middle 66 of 108 dp.
  render(`${name}-foreground`, svg(inner, { scale: 0.62 }));
}
console.log(`Wrote ${Object.keys(ICONS).length} icons to ${OUT}`);
