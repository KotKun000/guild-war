// Node harness: preprocess + OCR a hero-stat screenshot and compare with expected values.
// Usage: node scripts/test-ocr.mjs <image.png> [expected.json]   (uses the vendored traineddata)
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import { parseStatsFromOcr, preprocessPixels, STAT_ORDER } from '../public/ocr.js';

const require = createRequire(import.meta.url);
const Tesseract = require('tesseract.js');
const [img, expFile] = process.argv.slice(2);
if (!img) throw new Error('usage: node scripts/test-ocr.mjs <image> [expected.json]');
const expected = expFile ? JSON.parse(await readFile(expFile, 'utf8')) : null;

const { data, info } = await sharp(img).resize({ width: 1800 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const thr = preprocessPixels(data, info.width, info.height);
const png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
const worker = await Tesseract.createWorker(['tha', 'eng'], 1, {
  langPath: path.resolve('public/vendor/tesseract/lang'),
  gzip: true,
  cacheMethod: 'none',
  logger: () => {},
});
await worker.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' });
const t0 = Date.now();
const { data: ocr } = await worker.recognize(png);
const res = parseStatsFromOcr(ocr);
await worker.terminate();
console.log(`threshold ${thr}, ${Date.now() - t0} ms, missing: [${res.missing}]`);
let ok = 0;
for (const k of STAT_ORDER) {
  const got = res.stats[k], want = expected?.[k];
  const good = expected ? got === want : got !== undefined;
  if (good) ok++;
  console.log(`${good ? 'OK ' : 'BAD'} ${k.padEnd(8)} got=${got} ${expected ? 'want=' + want : ''}`);
}
console.log(`${ok}/${STAT_ORDER.length}`);
if (process.argv.includes('--raw')) console.log(res.raw);
process.exitCode = expected && ok !== STAT_ORDER.length ? 1 : 0;
