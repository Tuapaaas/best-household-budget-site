// Hearth & Ledger — the hand-in program (Node 22, standard library only).
//
// The site itself lives in app/ as plain static files: index.html plus the
// modules and stylesheet it loads, with no build step and no network use.
// This program's only job is to hand that site in: it gathers app/ and
// screenshots/ from beside this file into the output directory and writes
// dossier.json there, the summary the judge reads, using the vendored
// make.fun library. vendor/makefun-frontend.ts stays exactly as the kit
// shipped it: the scorer rebuilds the dossier with its own copy and the
// two must match byte for byte.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for
// /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// Where this file sits is where the site sits; where the output goes is
// the grader's /output, or MAKEFUN_OUTPUT_DIR when run by hand.
const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)));
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

// The scorer's own limits, kept here so a bad hand-in fails loudly at
// home instead of quietly on the server.
const MAX_SCREENSHOTS = 4;
const MAX_SHOT_BYTES = 262144;
const MAX_APP_FILES = 993;
const MAX_APP_BYTES = 16777216;

function countTree(dir) {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const info = statSync(path);
    if (info.isDirectory()) {
      const sub = countTree(path);
      files += sub.files;
      bytes += sub.bytes;
    } else if (info.isFile()) {
      files += 1;
      bytes += info.size;
    }
  }
  return { files, bytes };
}

function checkShots(dir) {
  if (!existsSync(dir)) throw new Error('screenshots/ is missing');
  const names = readdirSync(dir).filter((n) => !n.startsWith('.'));
  if (names.length < 3 || names.length > MAX_SCREENSHOTS) {
    throw new Error(`screenshots/ holds ${names.length} images, need 3 or 4`);
  }
  for (const name of names) {
    const size = statSync(join(dir, name)).size;
    if (size > MAX_SHOT_BYTES) throw new Error(`${name} is ${size} bytes, over the 256 KiB cap`);
  }
}

function checkApp(dir) {
  if (!existsSync(join(dir, 'index.html'))) throw new Error('app/index.html is missing');
  const { files, bytes } = countTree(dir);
  if (files > MAX_APP_FILES) throw new Error(`app/ holds ${files} files, over the 993 cap`);
  if (bytes > MAX_APP_BYTES) throw new Error(`app/ is ${bytes} bytes, over the 16 MiB cap`);
}

const appDir = join(repoRoot, 'app');
const shotsDir = join(repoRoot, 'screenshots');

checkApp(appDir);
checkShots(shotsDir);

mkdirSync(outputDir, { recursive: true });
cpSync(appDir, join(outputDir, 'app'), { recursive: true });
cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: MAX_SCREENSHOTS, max_bytes: MAX_SHOT_BYTES },
  app_max_files: MAX_APP_FILES,
  app_max_bytes: MAX_APP_BYTES,
});
const dossierPath = join(outputDir, 'dossier.json');
writeFileSync(dossierPath, dossier);

// A hand-in that cannot be read back is no hand-in: confirm the dossier
// parses and report what actually landed, so a silent failure is caught
// here instead of on the server. (buildDossier returns bytes, so the check
// reads back the file that was written.)
const parsed = JSON.parse(readFileSync(dossierPath, 'utf8'));
if (!parsed || typeof parsed.text !== 'string' || !parsed.text.length) {
  throw new Error('dossier.json came back empty or unreadable');
}
const appCount = countTree(appDir);
console.log(
  `handed in: app/ (${appCount.files} files) + ${readdirSync(shotsDir).length} screenshots -> ${outputDir} ` +
  `(dossier ${statSync(dossierPath).size} bytes)`,
);
