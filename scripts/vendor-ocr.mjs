// Copies the self-hosted Tesseract.js browser files into public/vendor/tesseract/ and downloads the
// tha + eng traineddata (tessdata_fast, gzipped) so the OCR feature never loads third-party resources.
// Usage: npm run ocr:vendor [-- --force]
import { mkdir, copyFile, writeFile, access, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const OUT = path.resolve('public/vendor/tesseract');
const LANG_OUT = path.join(OUT, 'lang');
const FORCE = process.argv.includes('--force');
const TESS = path.resolve('node_modules/tesseract.js/dist');
const CORE = path.resolve('node_modules/tesseract.js-core');
const DATA_BASE = 'https://github.com/tesseract-ocr/tessdata_fast/raw/main/';
const exists = (p) => access(p).then(() => true, () => false);

await mkdir(LANG_OUT, { recursive: true });
// we only use the LSTM engine (OEM 1), so only the *-lstm cores are needed (wasm is embedded in *.wasm.js)
const files = [
  [path.join(TESS, 'tesseract.min.js'), 'tesseract.min.js'],
  [path.join(TESS, 'worker.min.js'), 'worker.min.js'],
  [path.join(CORE, 'tesseract-core-lstm.wasm.js'), 'tesseract-core-lstm.wasm.js'],
  [path.join(CORE, 'tesseract-core-simd-lstm.wasm.js'), 'tesseract-core-simd-lstm.wasm.js'],
];
for (const [src, name] of files) {
  await copyFile(src, path.join(OUT, name));
  console.log('copied', name, ((await stat(src)).size / 1048576).toFixed(2), 'MiB');
}
for (const lang of ['tha', 'eng']) {
  const dest = path.join(LANG_OUT, `${lang}.traineddata.gz`);
  if (!FORCE && (await exists(dest))) { console.log('skip (exists)', lang); continue; }
  const res = await fetch(`${DATA_BASE}${lang}.traineddata`);
  if (!res.ok) throw new Error(`${lang}: HTTP ${res.status}`);
  const gz = gzipSync(Buffer.from(await res.arrayBuffer()), { level: 9 });
  await writeFile(dest, gz);
  console.log('wrote', `${lang}.traineddata.gz`, (gz.length / 1048576).toFixed(2), 'MiB');
}
