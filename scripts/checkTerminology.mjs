// AGENTS.md §4 binds the vocabulary of this project's documentation: the table binds the
// vocabulary, and nothing but a reader who knows it stands between a wrong term and a release.
//
// The corpus is the documentation someone opens to learn the language — every package's docs
// directory and every README. AGENTS.md and CLAUDE.md stay out of it: they carry the rule and
// have to name what they forbid. The changelogs stay out too, because an entry is the record
// of its day and is not rewritten.
//
// Prose only, never identifiers, is the goal — but not every pattern reaches it. `puppet`
// matches `puppeteer-core` and any mention of the Puppeteer tool, and `RemoteShadowObjectEnv`
// is itself an identifier. The rest need whitespace or a capital that camelCase cannot supply:
// `shadowEntity` is a field of the canvas element and `getEntityGraph()` is a method AGENTS.md
// keeps by name.
//
// "screen" is on the AGENTS.md list and deliberately absent here. It is banned *as analogy*,
// and no pattern tells that from its literal use: this workspace ships a package called
// shae-offscreen-canvas, and concepts.md says the renderer draws what the player sees on
// screen. A check that flags a correct sentence is a check people switch off.

import {globSync, readFileSync} from 'node:fs';

const CORPUS = ['README.md', 'packages/*/README.md', 'packages/*/docs/**/*.md'];

const BANNED = [
  {pattern: /shadow[\s-]+theat(er|re)/gi, use: 'name the mechanism: Kernel, Entity, Shadow Object'},
  {pattern: /puppet/gi, use: 'name the mechanism: Kernel, Entity, Shadow Object'},
  {pattern: /light[\s-]+world/gi, use: 'write View Layer'},
  {pattern: /shadow[\s-]+entit(y|ies)/gi, use: 'write Entity'},
  {pattern: /RemoteShadowObjectEnv/gi, use: 'write RemoteWorkerEnv'},
  {pattern: /shadow[\s-]+context/gi, use: 'write ComponentContext, or Entity Context for the injection along the entity tree'},
  {pattern: /component[\s-]+tag/gi, use: 'write Token'},
];

const files = CORPUS.flatMap((glob) => globSync(glob)).sort();

// A corpus that matches nothing passes every time and looks exactly like a corpus that is clean.
if (files.length === 0) {
  console.error(`no documentation found for ${CORPUS.join(', ')} -- run this from the repository root`);
  process.exit(1);
}

const hits = [];
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  for (const [index, line] of lines.entries()) {
    for (const {pattern, use} of BANNED) {
      for (const match of line.matchAll(pattern)) {
        hits.push(`${file}:${index + 1}: "${match[0]}" -- ${use}`);
      }
    }
  }
}

if (hits.length > 0) {
  console.error('Banned terminology in the documentation (AGENTS.md §4):');
  console.error(hits.join('\n'));
  process.exit(1);
}

console.log(`${files.length} documentation files, no banned terms`);
