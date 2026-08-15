#!/usr/bin/env node
/**
 * Copy src/examples/*.md → dist/examples/ after tsc build.
 * tsc only compiles .ts files, so markdown needs explicit copy.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(__dirname, '../src/examples');
const destDir = resolve(__dirname, '../dist/examples');

if (!existsSync(srcDir)) {
  console.warn('⚠  src/examples/ not found — skipping copy');
  process.exit(0);
}

if (!existsSync(destDir)) {
  mkdirSync(destDir, { recursive: true });
}

const files = readdirSync(srcDir).filter((f) => f.endsWith('.md'));
for (const f of files) {
  copyFileSync(join(srcDir, f), join(destDir, f));
}
console.log(`✓ Copied ${files.length} example(s): ${srcDir} → ${destDir}`);