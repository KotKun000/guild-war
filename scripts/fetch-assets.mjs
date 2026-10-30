// Downloads hero / pet / gear-set / ring icons from 7K Atlas (https://7katlas.com), resizes them,
// and writes public/img/** + public/assets.json so the site never loads images from third parties.
// Usage: node scripts/fetch-assets.mjs [--force]
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const BASE = 'https://7katlas.com/';
const OUT = path.resolve('public');
const FORCE = process.argv.includes('--force');
const SIZE = 128;
// square hero art; the site zooms into the face with CSS like the in-game cards
const HERO_W = 160;
const HERO_H = 160;
// Ring / skill / stat / set icons (keyed by the same Thai names as our data) come from 7K Note
const NOTE_BASE = 'https://7k-note.pages.dev';
// our stat keys -> 7K Note stat icon stem
const STAT_ICONS = {
  atk: 'PATK',
  def: 'DEF',
  hp: 'HP',
  spd: 'Speed',
  critRate: 'Crit',
  critDmg: 'CritDMG',
  weak: 'WeaknessHit',
  block: 'Block',
  hit: 'EffectHit',
  resist: 'EffectRes',
  dtr: 'DmgTakenReduce',
  amp: 'DMGAmp',
  crush: 'Crush',
  resil: 'Resilience',
  rejuv: 'Rejuvenate',
};
// spellings used in our data -> 7K Note file spelling
const RING_FILE_ALIASES = { แหวนแห่งการคืนชีพ: 'แหวนแห่งการคีนชีพ' };
const TYPE_ICONS = {
  Attack: 'RoleIcon_Type01_Attack',
  Magic: 'RoleIcon_Type02_Magic',
  Defense: 'RoleIcon_Type03_Defense',
  Support: 'RoleIcon_Type04_Support',
  Universal: 'RoleIcon_Type05_Universal',
};

// Short names used in our data (from 7k-note) -> 7K Atlas English name. First alias becomes the display name.
const HERO_ALIASES = {
  'Zenitsu Agatsuma': ['เซนอิทสึ'],
  'Tanjiro Kamado': ['ทันจิโร่'],
  'Giyu Tomioka': ['กิยู'],
  'Shinobu Kocho': ['ชิโนบุ'],
  Freyja: ['เฟรย่า'],
  // 7K Note spells these differently: extra aliases make their skill lists match (first alias stays the display name)
  Karma: ['คาร์ม่า', 'คาร์มา'],
  Chancellor: ['ชานซะเลอร์', 'ชานชะเลอร์'],
  Klahan: ['พยัคฆ์เมฆา', 'คลาฮาน'],
  Rachel: ['ราเชล', 'เรเชล'],
};
const PET_ALIASES = { Richel: ['รีเซล'] };

// Thai gear set name -> 7K Atlas set badge stem
const SETS = {
  นักฆ่า: 'Assassin',
  นายประตู: 'Gatekeeper',
  ผู้พิทักษ์: 'Guardian',
  ผู้ล้างแค้น: 'Avenger',
  ผู้ปรับสมดุล: 'Orchestrator',
  หมอผี: 'Spellweaver',
  ผู้บัญชาการ: 'Vanguard',
  ผู้ไล่ล่า: 'Bounty',
  อัศวินศักดิ์สิทธิ์: 'Paladin',
};


const RARITY_ORDER = ['L++', 'L+', 'L', 'R', 'UC', 'C'];

async function text(url) {
  const res = await fetch(BASE + url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

async function loadArray(url, name) {
  return new Function(`${await text(url)}\n;return ${name};`)();
}

async function scriptUrl(page, pattern) {
  const html = await text(page);
  const m = html.match(pattern);
  if (!m) throw new Error(`script ${pattern} not found in ${page}`);
  return m[0];
}

const exists = (p) => access(p).then(() => true, () => false);

async function download(src, dest, size = SIZE, height = size) {
  if (!src) return null;
  const file = path.join(OUT, dest);
  if (FORCE || !(await exists(file))) {
    const res = await fetch(BASE + src);
    if (!res.ok) {
      console.warn(`  ! ${res.status} ${src}`);
      return null;
    }
    await mkdir(path.dirname(file), { recursive: true });
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(file, await sharp(buf).resize(size, height, { fit: 'cover', position: 'top' }).webp({ quality: 82 }).toBuffer());
  }
  return '/' + dest.replace(/\\/g, '/');
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k], k);
      }
    }),
  );
  return out;
}

async function downloadAbs(url, dest, size) {
  const file = path.join(OUT, dest);
  if (FORCE || !(await exists(file))) {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  ! ${res.status} ${url}`);
      return null;
    }
    await mkdir(path.dirname(file), { recursive: true });
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(file, await sharp(buf).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 85 }).toBuffer());
  }
  return '/' + dest.replace(/\\/g, '/');
}

// Pull icon tables out of the 7K Note bundle: hero -> skills [{file, name}] (order: ล่าง, บน, อเวค) + hashed asset URLs
async function fetchNoteAssets() {
  const html = await (await fetch(NOTE_BASE + '/')).text();
  const entry = html.match(/\/assets\/index-[\w-]+\.js/)[0];
  const js = await (await fetch(NOTE_BASE + entry)).text();
  const urls = [...new Set([...js.matchAll(/"(\/assets\/[^"]+\.webp)"/g)].map((m) => m[1]))];
  const urlFor = (stem) => urls.find((u) => decodeURIComponent(u).split('/').pop().startsWith(stem + '-'));

  // the skills table is the object literal whose values look like [{file:"Tex_Skill_...",name:"..."}]
  const marker = js.search(/=\{"?[^"{}=]{1,40}"?:\[\{file:"Tex_Skill_/);
  if (marker < 0) throw new Error('7K Note skill table not found');
  let depth = 0;
  let end = marker + 1;
  for (; end < js.length; end++) {
    if (js[end] === '{') depth++;
    else if (js[end] === '}' && --depth === 0) break;
  }
  const table = new Function(`return ${js.slice(marker + 1, end + 1)}`)();

  const skills = {};
  await pool(Object.entries(table), 8, async ([hero, list]) => {
    skills[hero] = [];
    for (const s of list || []) {
      if (!s?.file) {
        skills[hero].push(null);
        continue;
      }
      const stem = s.file.replace(/\.webp$/, '');
      const u = urlFor(stem);
      skills[hero].push({ name: s.name, kind: stem.slice(-2), img: u ? await downloadAbs(NOTE_BASE + u, `img/skills/${stem}.webp`, 64) : null });
    }
  });

  const rings = {};
  for (const u of urls.filter((x) => decodeURIComponent(x).includes('/ring-'))) {
    const th = decodeURIComponent(u).split('/ring-').pop().replace(/-[\w-]{8}\.webp$/, '');
    const i = Object.keys(rings).length;
    rings[th] = await downloadAbs(NOTE_BASE + u, `img/rings/r${String(i).padStart(2, '0')}.webp`, 64);
  }
  for (const [ours, theirs] of Object.entries(RING_FILE_ALIASES)) if (rings[theirs]) rings[ours] = rings[theirs];

  const sets = {};
  for (const [th, stem] of Object.entries(SETS)) {
    const u = urlFor(`set-${stem}`);
    if (u) sets[th] = await downloadAbs(NOTE_BASE + u, `img/sets/${stem}.webp`, 64);
  }

  const stats = {};
  for (const [key, stem] of Object.entries(STAT_ICONS)) {
    const u = urlFor(stem);
    if (u) stats[key] = await downloadAbs(NOTE_BASE + u, `img/stats/${stem}.webp`, 40);
  }

  // the awakening badge is inlined as a data URI right after the first `="data:image/webp;base64,` that precedes the awake portrait code
  let awakeBadge = null;
  const awk = js.match(/src:(\w+),alt:(?:\w+\()?"อเวค"/) || js.match(/alt:(?:\w+\()?"อเวค"[^}]*?src:(\w+)/);
  const varName = awk?.[1];
  const dataUri = varName && js.match(new RegExp(`${varName}="(data:image\\/webp;base64,[A-Za-z0-9+/=]+)"`))?.[1];
  if (dataUri) {
    await mkdir(path.join(OUT, 'img'), { recursive: true });
    await writeFile(path.join(OUT, 'img/awake.webp'), Buffer.from(dataUri.split(',')[1], 'base64'));
    awakeBadge = '/img/awake.webp';
  }
  console.log(`7K Note: ${Object.keys(skills).length} heroes with skills, ${Object.keys(rings).length} rings, ${Object.keys(sets).length} sets, ${Object.keys(stats).length} stats, awake badge: ${!!awakeBadge}`);
  return { skills, rings, sets, stats, awakeBadge };
}

const best = (p) => p?.s6 || p?.s5 || p?.s4 || p?.s3 || null;
const lastWord = (s) => (s && s.includes(' ') ? s.split(' ').pop() : null);

async function main() {
  const codexUrl = await scriptUrl('codex.html', /COMBINE\/codex_lite_heroes\.js[^"']*/);
  const heroes = await loadArray(codexUrl, 'HEROES');
  const petsPage = await text('pets.html');
  const petUrls = [...petsPage.matchAll(/COMBINE\/pets-[A-Z+]+\.js[^"']*/g)].map((m) => m[0]);
  const pets = (await Promise.all(petUrls.map((u) => loadArray(u, u.match(/pets-([A-Z+]+)/)[1].replace(/^/, 'PETS_'))))).flat();
  console.log(`heroes: ${heroes.length}, pets: ${pets.length}`);

  const heroOut = await pool(heroes, 8, async (h) => {
    const aliases = [...(HERO_ALIASES[h.name] || []), h.name_th, lastWord(h.name_th), h.name].filter(Boolean);
    const awk = await download(h.portraits?.awk, `img/heroes/${h.id}-awk.webp`, HERO_W, HERO_H);
    return {
      id: h.id,
      name: aliases[0],
      en: h.name,
      rarity: h.rarity,
      type: h.type || null,
      released: h.release_date || '',
      aliases: [...new Set(aliases)],
      // awake-only heroes (new releases) have no base portrait on 7K Atlas: reuse the awake one
      img: (await download(best(h.portraits), `img/heroes/${h.id}.webp`, HERO_W, HERO_H)) || awk,
      awk,
    };
  });

  const petOut = await pool(pets, 8, async (p) => {
    const aliases = [...(PET_ALIASES[p.name] || []), p.name_th, p.name].filter(Boolean);
    return { id: p.id, name: aliases[0], en: p.name, rarity: p.rarity, aliases: [...new Set(aliases)], img: await download(p.icon, `img/pets/${p.id}.webp`) };
  });

  const note = await fetchNoteAssets();

  const types = {};
  for (const [t, file] of Object.entries(TYPE_ICONS)) types[t] = await download(`images/classification/${file}.webp`, `img/types/${t}.webp`, 40);

  // newest first inside each rarity group (like the in-game list)
  const byRarity = (a, b) =>
    RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) || (b.released || '').localeCompare(a.released || '') || a.name.localeCompare(b.name, 'th');
  const skipped = heroOut.filter((h) => !h.img);
  if (skipped.length) console.log(`  ! skipped heroes with no portrait: ${skipped.map((h) => `${h.name} (${h.en}, ${h.released || '?'})`).join(', ')}`);
  const assets = {
    source: 'Heroes/pets/types: 7K Atlas (7katlas.com) · skills/rings/sets/stats: 7K Note (7k-note.pages.dev)',
    updatedAt: new Date().toISOString(),
    heroes: heroOut.filter((h) => h.img).sort(byRarity),
    pets: petOut.filter((p) => p.img).sort(byRarity),
    types,
    ...note,
  };
  await writeFile(path.join(OUT, 'assets.json'), JSON.stringify(assets));
  console.log(`wrote public/assets.json: ${assets.heroes.length} heroes, ${assets.pets.length} pets`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
