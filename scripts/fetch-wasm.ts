// Download the php2.wasm this package ships, from the p8 wasm release that
// p8-wasm.json pins, and check it before writing it beside package.json.
//
//   npm run fetch:wasm
//
// The file must match the pin's sha256 and the release's own release.json:
// the npm package carries the release's bytes, never a rebuild (APS 9).

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RELEASES = 'https://p8-wasm-releases.addis.gg';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pin = JSON.parse(readFileSync(join(packageDir, 'p8-wasm.json'), 'utf8')) as { version: string; sha256: string };
if (!pin.version || !/^[0-9a-f]{64}$/.test(pin.sha256)) {
  console.error('p8-wasm.json pins no release yet: set "version" and "sha256"');
  process.exit(1);
}

async function get(url: string): Promise<Buffer> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

const base = `${RELEASES}/${pin.version}`;
const release = JSON.parse((await get(`${base}/release.json`)).toString()) as { files: Record<string, { sha256: string }> };
const listed = release.files['php2.wasm']?.sha256;
if (listed !== pin.sha256) throw new Error(`release.json lists php2.wasm as ${listed}, p8-wasm.json pins ${pin.sha256}`);
const wasm = await get(`${base}/php2.wasm`);
const got = createHash('sha256').update(wasm).digest('hex');
if (got !== pin.sha256) throw new Error(`${base}/php2.wasm is ${got}, p8-wasm.json pins ${pin.sha256}`);
writeFileSync(join(packageDir, 'php2.wasm'), wasm);
console.log(`php2.wasm ${pin.version}: ${wasm.length} bytes, sha256 ${got}`);
