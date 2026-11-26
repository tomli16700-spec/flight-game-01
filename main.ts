// Skylark Canyon Run — the hand-in program (Node 22, standard library only).
//
// It assembles the entry the grader reads: the playable game under game/,
// the maker's screenshots under screenshots/, and the dossier.json the
// judge reads, written by the vendored make.fun library. It runs twice in
// the grader and both runs must write the same bytes, so it does nothing
// time- or random-dependent: a straight copy, then the dossier.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function handIn() {
  // Start from an empty output directory so a second run can never leave
  // stale files behind and differ from the first.
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  // The game: plain static files, no build step, no network at run time.
  cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

  // The screenshots, in name order; the first is the cover.
  mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  const shotsDir = join(repoRoot, 'screenshots');
  if (existsSync(shotsDir)) {
    cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
  }

  // The dossier the judge reads: the library writes it from the files
  // above, with the caps the scorer enforces (see the kit's RULES.txt).
  writeFileSync(
    join(outputDir, 'dossier.json'),
    buildDossier(outputDir, {
      text_max_bytes: 163840,
      screenshots: { max: 4, max_bytes: 262144 },
      game_max_files: 993,
      game_max_bytes: 50331648,
      game_path_max_bytes: 1000,
    }),
  );

  console.log(`skylark canyon run: wrote ${outputDir}/game, ${outputDir}/screenshots and ${outputDir}/dossier.json`);
}

handIn();
