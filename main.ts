// main.ts: Entry point for the Ritual & Ruin submission.
// Copies game/ and screenshots/ beside this file into the output dir,
// wipes the output dir first, then writes /output/dossier.json with
// buildDossier from the kit's vendored module. Node 22, stdlib only.
//
// Overlap revision (Round 3, second pass): the altar rings on the table,
// title and end screens are now clipped around every frame, card, label
// and line of text with the even-odd rule, so no ring crosses a border or
// a word; the threat pill and YOUR TURN got breathing room below the
// opponent frame, the hand fan is wider so every suit label reads, and
// the action buttons moved up so the judge hook line clears them.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');

if (!existsSync(gameDir)) throw new Error('main.ts: game/ is missing beside main.ts');
if (!existsSync(shotsDir)) throw new Error('main.ts: screenshots/ is missing beside main.ts');

mkdirSync(outDir, { recursive: true });
for (const entry of readdirSync(outDir)) {
  rmSync(join(outDir, entry), { recursive: true, force: true });
}
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});

function countFiles(dir) {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    n += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
  }
  return n;
}

writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log('game files copied: ' + countFiles(join(outDir, 'game')));
console.log('dossier bytes: ' + dossier.length);
console.log('output written to ' + outDir);
