import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const base = '/TrussIQ/';
const indexPath = path.join(dist, 'index.html');
const manifestPath = path.join(dist, '.vite', 'manifest.json');

if (!existsSync(indexPath)) {
  throw new Error('GitHub Pages artifact is missing dist/index.html. Run the production build first.');
}
if (!existsSync(manifestPath)) {
  throw new Error('Vite build manifest is missing. Build with the production Vite configuration first.');
}

const html = readFileSync(indexPath, 'utf8');
const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((reference) => reference.startsWith('/') && !reference.startsWith('//'));

if (!references.length) throw new Error('No local script, stylesheet, or icon references found in dist/index.html.');

for (const reference of references) {
  if (!reference.startsWith(base)) {
    throw new Error(`Local asset does not use the GitHub Pages base path ${base}: ${reference}`);
  }
  const assetPath = path.resolve(dist, `.${reference.slice(base.length - 1)}`);
  const relativePath = path.relative(dist, assetPath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath) || !existsSync(assetPath)) {
    throw new Error(`GitHub Pages asset is missing or outside dist: ${reference}`);
  }
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const manifestEntries = Object.entries(manifest);
const verifyOutputFile = (file, source) => {
  if (typeof file !== 'string' || !file) throw new Error(`Invalid output file entry in Vite manifest: ${source}`);
  const outputPath = path.resolve(dist, file);
  const relativePath = path.relative(dist, outputPath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath) || !existsSync(outputPath)) {
    throw new Error(`Vite output file is missing or outside dist: ${file} (referenced by ${source})`);
  }
};

for (const [key, entry] of manifestEntries) {
  verifyOutputFile(entry.file, key);
  for (const file of [...(entry.css ?? []), ...(entry.assets ?? [])]) verifyOutputFile(file, key);
  for (const importedKey of [...(entry.imports ?? []), ...(entry.dynamicImports ?? [])]) {
    if (!manifest[importedKey]) throw new Error(`Vite manifest entry ${key} references missing chunk ${importedKey}.`);
  }
}

console.log(`GitHub Pages artifact paths verified (${references.length} HTML assets, ${manifestEntries.length} manifest entries).`);
