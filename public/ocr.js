// Read hero stats from a screenshot of the in-game hero info window (client-side OCR).
// Lazy-loaded by app.js. Tesseract.js is self-hosted under /vendor/tesseract (run `npm run ocr:vendor`).
// parseStatsFromOcr / preprocessPixels are pure (no DOM) so they can be unit-tested in Node.

// stat keys in the in-game order: left column (8 rows) then right column (7 rows)
export const STAT_ORDER = ['atk', 'def', 'hp', 'spd', 'critRate', 'critDmg', 'weak', 'block', 'hit', 'resist', 'dtr', 'amp', 'crush', 'resil', 'rejuv'];
const LEFT_COUNT = 8;
const PCT = new Set(['critRate', 'critDmg', 'weak', 'block', 'hit', 'resist', 'dtr', 'amp', 'crush', 'resil', 'rejuv']);

// label aliases per stat (same names as STAT_FULL in app.js + variants seen in game)
const LABELS = {
  atk: ['พลังโจมตีกายภาพ', 'พลังโจมตีเวท', 'พลังโจมตี'],
  def: ['พลังป้องกัน'],
  hp: ['HP'],
  spd: ['ความเร็วโจมตี', 'ความเร็ว'],
  critRate: ['อัตราคริติคอล'],
  critDmg: ['ความเสียหายคริติคอล'],
  weak: ['อัตราโจมตีจุดอ่อน'],
  block: ['อัตราบล็อก'],
  hit: ['ผลเข้าเป้า'],
  resist: ['ต้านทานผล'],
  dtr: ['ลดความเสียหายที่ได้รับ'],
  amp: ['เสริมความเสียหาย'],
  crush: ['บดขยี้'],
  resil: ['ยืดหยุ่น'],
  rejuv: ['ฟื้นคืน'],
};

// ---------- text helpers ----------
const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙';
// Thai vowel marks / tone marks are the most commonly misread glyphs: ignore them when comparing labels
const THAI_MARKS = /[ัิ-ฺ็-๎]/g;
const toAscii = (s) => String(s ?? '').replace(/[๐-๙]/g, (c) => String(THAI_DIGITS.indexOf(c)));
const labelKey = (s) => toAscii(s).replace(THAI_MARKS, '').replace(/[^ก-๛A-Za-z0-9]/g, '').toLowerCase();

const CONFUSE = { O: '0', o: '0', Q: '0', D: '0', l: '1', I: '1', '|': '1', i: '1', S: '5', s: '5', B: '8', Z: '2' };
// a token that looks like a number once common OCR confusions are fixed (needs a digit or a trailing %)
function numericToken(text) {
  let t = toAscii(text).replace(/\s+/g, '').replace(/[‘’'`“”"]/g, '');
  if (!/^[0-9OoQDlI|iSsBZ.,]+%?$/.test(t)) return null;
  const pct = t.endsWith('%');
  if (pct) t = t.slice(0, -1);
  if (!t || (!pct && !/[0-9]/.test(t))) return null; // letters only ("i", "S") is not a number
  const digits = t.replace(/[OoQDlI|iSsBZ]/g, (c) => CONFUSE[c]);
  if (!/^[0-9.,]+$/.test(digits)) return null;
  return { raw: digits, pct };
}

// Sellers' approximate substring match: lowest edit distance of `pat` against any substring of `text`
function approxDist(pat, text) {
  const m = pat.length;
  let prev = Array.from({ length: m + 1 }, (_, i) => i);
  let best = prev[m];
  for (let j = 1; j <= text.length; j++) {
    const cur = [0];
    for (let i = 1; i <= m; i++) {
      cur[i] = Math.min(prev[i] + 1, cur[i - 1] + 1, prev[i - 1] + (pat[i - 1] === text[j - 1] ? 0 : 1));
    }
    if (cur[m] < best) best = cur[m];
    prev = cur;
  }
  return best;
}

// ---------- word extraction ----------
function bboxOf(w) {
  const b = w.bbox || {};
  return { x0: b.x0 ?? b.left ?? 0, y0: b.y0 ?? b.top ?? 0, x1: b.x1 ?? (b.left ?? 0) + (b.width ?? 0), y1: b.y1 ?? (b.top ?? 0) + (b.height ?? 0) };
}
function collectWords(data) {
  let words = data?.words;
  if (!words?.length) {
    words = [];
    for (const blk of data?.blocks || []) for (const p of blk.paragraphs || []) for (const l of p.lines || []) for (const w of l.words || []) words.push(w);
  }
  const out = [];
  for (const w of words) {
    const text = String(w.text ?? '').trim();
    if (!text) continue;
    const b = bboxOf(w);
    if (!(b.x1 > b.x0 && b.y1 > b.y0)) continue;
    // "ต้านทานผล100%" glued together: split the trailing number off with a proportional box
    const m = text.match(/^(.*[ก-๚a-zA-Z])\s*([0-9๐-๙OoIl|,.]*[0-9๐-๙][0-9๐-๙OoIl|,.]*%?)$/);
    if (m && m[1].length >= 2 && labelKey(m[1]).length >= 2) {
      const cut = b.x0 + ((b.x1 - b.x0) * m[1].length) / text.length;
      out.push({ text: m[1], ...b, x1: cut });
      out.push({ text: m[2], ...b, x0: cut });
    } else out.push({ text, ...b });
  }
  return out.map((w) => ({ ...w, xc: (w.x0 + w.x1) / 2, yc: (w.y0 + w.y1) / 2, h: w.y1 - w.y0 }));
}

// ---------- value sanity ----------
function toValue(key, tok) {
  let s = tok.raw;
  if (PCT.has(key)) {
    // stray thousands comma / dot noise: keep a single decimal point
    s = s.replace(/,/g, '.');
    const parts = s.split('.');
    if (parts.length > 2) s = parts[0] + '.' + parts.slice(1).join('');
  } else {
    if (tok.pct) return undefined; // a flat stat never has %
    s = s.replace(/,/g, '');
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); // 4.181 -> 4181
    if (s.includes('.')) return undefined;
  }
  const v = Number(s);
  if (!Number.isFinite(v) || v < 0) return undefined;
  if (PCT.has(key) && v > 1000) return undefined;
  if (key === 'spd' && v >= 1000) return undefined;
  return v;
}

// group right edges (values are right-aligned) into columns: a new column starts at a gap > `gap`
function columnsByX1(toks, gap) {
  const s = [...toks].sort((a, b) => a.x1 - b.x1);
  const cols = [];
  for (const t of s) {
    const c = cols[cols.length - 1];
    if (c && t.x1 - c[c.length - 1].x1 <= gap) c.push(t);
    else cols.push([t]);
  }
  return cols.sort((a, b) => b.length - a.length).slice(0, 2).sort((a, b) => a[0].x1 - b[0].x1);
}
// from `toks` (sorted by y) pick the `n` consecutive ones with the most even vertical spacing
function bestRun(toks, n) {
  if (toks.length === n) return toks;
  if (toks.length < n) return null;
  let best = null, bestScore = Infinity;
  for (let i = 0; i + n <= toks.length; i++) {
    const run = toks.slice(i, i + n);
    const gaps = run.slice(1).map((t, k) => t.yc - run[k].yc);
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const score = gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length;
    if (score < bestScore) { bestScore = score; best = run; }
  }
  return best;
}

/**
 * Parse stats out of Tesseract's result.
 * @param data Tesseract `data` (needs `words` with `bbox`, optional `text`)
 * @returns {{stats: Object<string, number>, missing: string[], raw: string}}
 */
export function parseStatsFromOcr(data) {
  const words = collectWords(data);
  const raw = String(data?.text ?? words.map((w) => w.text).join(' '));
  const stats = {};

  const nums = [];
  const texts = [];
  for (const w of words) {
    const n = numericToken(w.text);
    if (n) nums.push({ ...w, tok: n });
    else texts.push(w);
  }

  // --- primary: label matching ---
  // every numeric token collects the text to its left on the same row (up to the previous number on that row)
  const cands = [];
  for (const n of nums) {
    const tol = Math.max(n.h * 0.6, 6);
    const prevX1 = Math.max(-Infinity, ...nums.filter((o) => o !== n && Math.abs(o.yc - n.yc) < tol && o.xc < n.xc).map((o) => o.x1));
    const cell = texts
      .filter((t) => Math.abs(t.yc - n.yc) < tol * 1.3 && t.xc < n.x0 && t.xc > prevX1)
      .sort((a, b) => a.x0 - b.x0)
      .map((t) => t.text)
      .join('');
    const key = labelKey(cell);
    if (key.length < 2) continue;
    for (const k of STAT_ORDER) {
      let best = 0;
      for (const alias of LABELS[k]) {
        const a = labelKey(alias);
        if (a === 'hp') { if (/h[p9]/.test(key)) best = Math.max(best, 1); continue; }
        const score = 1 - approxDist(a, key) / a.length;
        // longer aliases are more specific: tiny bonus so "พลังโจมตีกายภาพ" beats a bare substring hit
        best = Math.max(best, score + a.length * 0.0005);
      }
      if (best >= 0.62) cands.push({ k, n, score: best });
    }
  }
  cands.sort((a, b) => b.score - a.score);
  const usedKey = new Set(), usedTok = new Set();
  for (const c of cands) {
    if (usedKey.has(c.k) || usedTok.has(c.n)) continue;
    const v = toValue(c.k, c.n.tok);
    if (v === undefined) continue;
    stats[c.k] = v;
    usedKey.add(c.k);
    usedTok.add(c.n);
  }

  // --- fallback: positional (two columns, 8 + 7 rows, right-aligned values) ---
  if (Object.keys(stats).length < STAT_ORDER.length && nums.length >= 6) {
    // header junk ("LV.30"), skill levels etc. are not clean numbers, but stray digits can slip in: keep tokens
    // whose height matches the typical value height
    const hs = nums.map((n) => n.h).sort((a, b) => a - b);
    const mh = hs[Math.floor(hs.length / 2)];
    const panel = nums.filter((n) => n.h > mh * 0.6 && n.h < mh * 1.6);
    if (panel.length >= 6) {
      const cols = columnsByX1(panel, mh * 1.5);
      const byY = (c) => (c || []).sort((p, q) => p.yc - q.yc);
      const L = cols.length === 2 ? bestRun(byY(cols[0]), LEFT_COUNT) : null;
      const R = cols.length === 2 ? bestRun(byY(cols[1]), STAT_ORDER.length - LEFT_COUNT) : null;
      const assign = (col, keys) => {
        if (!col) return;
        col.forEach((n, i) => {
          const k = keys[i];
          if (stats[k] !== undefined || usedTok.has(n)) return;
          const v = toValue(k, n.tok);
          if (v !== undefined) stats[k] = v;
        });
      };
      assign(L, STAT_ORDER.slice(0, LEFT_COUNT));
      assign(R, STAT_ORDER.slice(LEFT_COUNT));
    }
  }

  const missing = STAT_ORDER.filter((k) => stats[k] === undefined);
  return { stats, missing, raw };
}

// ---------- preprocessing (pure; works on RGBA bytes) ----------
/** grayscale + Otsu threshold (clamped) + invert: white-on-dark text becomes black-on-white. Mutates `rgba`. */
export function preprocessPixels(rgba, w, h) {
  const n = w * h;
  const gray = new Uint8Array(n);
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) {
    const g = (rgba[i * 4] * 299 + rgba[i * 4 + 1] * 587 + rgba[i * 4 + 2] * 114) / 1000;
    gray[i] = g;
    hist[g | 0]++;
  }
  // Otsu, clamped: the stat window is dark rows with white text, so the cut should sit in the bright tail
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];
  let wB = 0, sumB = 0, maxVar = -1, otsu = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = n - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const v = wB * wF * (mB - mF) ** 2;
    if (v > maxVar) { maxVar = v; otsu = t; }
  }
  const thr = Math.min(175, Math.max(125, otsu));
  for (let i = 0; i < n; i++) {
    const v = gray[i] > thr ? 0 : 255;
    rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = v;
    rgba[i * 4 + 3] = 255;
  }
  return thr;
}

// ---------- browser: image decode / preview / worker ----------
const TARGET_W = 1800;
const BASE = '/vendor/tesseract';

/** decode a File/Blob, return { canvas (preprocessed, ~1800px wide), preview (small jpeg data URL) } */
export async function prepareImage(file) {
  const bmp = await createImageBitmap(file);
  try {
    const scale = TARGET_W / bmp.width;
    const w = TARGET_W, h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingQuality = 'high';
    // preview first (colour, small): data: URLs are allowed by img-src, blob: is not
    const pw = Math.min(640, bmp.width), ph = Math.round((bmp.height * pw) / bmp.width);
    const pc = document.createElement('canvas');
    pc.width = pw;
    pc.height = ph;
    pc.getContext('2d').drawImage(bmp, 0, 0, pw, ph);
    const preview = pc.toDataURL('image/jpeg', 0.82);
    ctx.drawImage(bmp, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    preprocessPixels(img.data, w, h);
    ctx.putImageData(img, 0, 0);
    return { canvas, preview };
  } finally {
    bmp.close?.();
  }
}

let scriptP = null;
function loadScript() {
  if (window.Tesseract) return Promise.resolve();
  scriptP ||= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = `${BASE}/tesseract.min.js`;
    s.onload = () => res();
    s.onerror = () => { scriptP = null; rej(new Error('โหลดตัวอ่านภาพไม่สำเร็จ')); };
    document.head.appendChild(s);
  });
  return scriptP;
}

let workerP = null;
let progressCb = () => {};
/** one worker per session; progress goes to whichever callback is current */
export function getWorker(onProgress) {
  if (onProgress) progressCb = onProgress;
  workerP ||= (async () => {
    await loadScript();
    progressCb({ status: 'starting', progress: 0 });
    const w = await window.Tesseract.createWorker(['tha', 'eng'], 1, {
      workerPath: `${BASE}/worker.min.js`,
      corePath: BASE,
      langPath: `${BASE}/lang`,
      workerBlobURL: false,
      gzip: true,
      logger: (m) => progressCb(m),
    });
    await w.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' });
    return w;
  })().catch((e) => { workerP = null; throw e; });
  return workerP;
}

/** OCR a prepared canvas and parse it -> { stats, missing, raw } */
export async function recognizeCanvas(canvas, onProgress) {
  const worker = await getWorker(onProgress);
  const { data } = await worker.recognize(canvas);
  return parseStatsFromOcr(data);
}
