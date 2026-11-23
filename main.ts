// main.ts: Entry point for the Ritual & Ruin submission.
// Copies game/ and screenshots/ beside this file into the output dir,
// wipes the output dir first, then writes /output/dossier.json with
// buildDossier from the kit's vendored module. Node 22, stdlib only.
//
// Fix pass for Round 3 (visual and presentation only, no rule or balance
// changes): the table now draws a layered felt with a chalk altar circle
// and ritual frames, the dual-use panel explains each selected card, the
// AI threat line names the nearest ritual with its progress, cards fly
// from hand to ritual or discard on a tweened proxy, and the title and
// end screens share the same altar seal with a stronger payoff.

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
