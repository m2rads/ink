// Fetches Grammalecte, the French grammar checker lib/grammar.ts runs, into
// vendor/grammalecte (git-ignored). Runs on `bun install` (postinstall), so
// local installs and deployments get it without it living in the repo.
//
// Why it isn't committed: Grammalecte is GPL 3 and this repo is public.
// Ink only runs it on its own server and never ships it to browsers, which
// the GPL allows without relicensing Ink; keeping its code out of the repo
// keeps that line clean. Its licence goes along in vendor/grammalecte.
//
// The source is the JavaScript build inside Grammalecte's Firefox extension
// (the only JavaScript release), pinned to one version and checked against
// the hash Mozilla publishes for it. To upgrade, change VERSION, URL and
// SHA256 together (https://addons.mozilla.org/api/v5/addons/addon/grammalecte-fr/versions/<version>/).
//
//   bun scripts/fetch-grammalecte.ts           fetch if missing or outdated
//   bun scripts/fetch-grammalecte.ts --force   fetch again

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { unzipSync } from "fflate";

import { DATA, SCRIPTS } from "../lib/grammar/files";

const VERSION = "2.3.0";
const URL = "https://addons.mozilla.org/firefox/downloads/file/4643560/grammalecte_fr-2.3.0.xpi";
const SHA256 = "443030004dbf62ecd5fc42f7b96872b96c9e3765f1cba4704a2a4170bb945256";

const OUT = join(import.meta.dir, "..", "vendor", "grammalecte");
const STAMP = join(OUT, "VERSION");

const LICENCE = ["README.txt", "WARNING.txt"];

async function main() {
  const force = process.argv.includes("--force");
  if (!force && existsSync(STAMP) && readFileSync(STAMP, "utf8").trim() === VERSION) return;

  const response = await fetch(URL);
  if (!response.ok) throw new Error(`Grammalecte download failed: ${response.status} ${URL}`);
  const xpi = new Uint8Array(await response.arrayBuffer());
  const hash = createHash("sha256").update(xpi).digest("hex");
  if (hash !== SHA256) throw new Error(`Grammalecte ${VERSION}: unexpected sha256 ${hash}`);

  const wanted = new Set([...SCRIPTS, ...Object.values(DATA), ...LICENCE].map((f) => `grammalecte/${f}`));
  const files = unzipSync(xpi, { filter: (f) => wanted.has(f.name) });
  const missing = [...wanted].filter((f) => !files[f]);
  if (missing.length) throw new Error(`Grammalecte ${VERSION}: missing ${missing.join(", ")}`);

  rmSync(OUT, { recursive: true, force: true });
  for (const [name, bytes] of Object.entries(files)) {
    const to = join(OUT, name.slice("grammalecte/".length));
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, bytes);
  }
  writeFileSync(
    join(OUT, "NOTICE.md"),
    `Grammalecte ${VERSION}, by Olivier R. (https://grammalecte.net), GPL 3.\n\n` +
      `Fetched by scripts/fetch-grammalecte.ts from ${URL} (sha256 ${SHA256}), unmodified.\n` +
      `Source: https://grammalecte.net. Licence text: https://www.gnu.org/licenses/gpl-3.0.html\n`,
  );
  writeFileSync(STAMP, `${VERSION}\n`);
  console.log(`Grammalecte ${VERSION} → vendor/grammalecte`);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
