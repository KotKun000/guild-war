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
// hero cards are tall like in-game cards
const HERO_W = 112;
const HERO_H = 140;
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

// Thai ring name -> 7K Atlas accessory icon (tier/key). Only mappings we are sure about; others render as text.
const RINGS = {
  แหวนอมตะ: 'L/Immortal',
  แหวนแห่งการคืนชีพ: 'L/Revive',
  แหวนแห่งความตาย: 'UC/Death',
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
    return {
      id: h.id,
      name: aliases[0],
      en: h.name,
      rarity: h.rarity,
      type: h.type || null,
      released: h.release_date || '',
      aliases: [...new Set(aliases)],
      img: await download(best(h.portraits), `img/heroes/${h.id}.webp`, HERO_W, HERO_H),
      awk: await download(h.portraits?.awk, `img/heroes/${h.id}-awk.webp`, HERO_W, HERO_H),
    };
  });

  const petOut = await pool(pets, 8, async (p) => {
    const aliases = [...(PET_ALIASES[p.name] || []), p.name_th, p.name].filter(Boolean);
    return { id: p.id, name: aliases[0], en: p.name, rarity: p.rarity, aliases: [...new Set(aliases)], img: await download(p.icon, `img/pets/${p.id}.webp`) };
  });

  const sets = {};
  for (const [th, stem] of Object.entries(SETS)) sets[th] = await download(`images/gears/seticons/${stem}.webp`, `img/sets/${stem}.webp`, 48);
  const rings = {};
  for (const [th, key] of Object.entries(RINGS)) rings[th] = await download(`images/gears/acc/${key}.webp`, `img/rings/${key.split('/')[1]}.webp`, 48);

  const types = {};
  for (const [t, file] of Object.entries(TYPE_ICONS)) types[t] = await download(`images/classification/${file}.webp`, `img/types/${t}.webp`, 40);

  // newest first inside each rarity group (like the in-game list)
  const byRarity = (a, b) =>
    RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) || (b.released || '').localeCompare(a.released || '') || a.name.localeCompare(b.name, 'th');
  const assets = {
    source: '7K Atlas — https://7katlas.com',
    updatedAt: new Date().toISOString(),
    heroes: heroOut.filter((h) => h.img).sort(byRarity),
    pets: petOut.filter((p) => p.img).sort(byRarity),
    sets,
    rings,
    types,
  };
  await writeFile(path.join(OUT, 'assets.json'), JSON.stringify(assets));
  console.log(`wrote public/assets.json: ${assets.heroes.length} heroes, ${assets.pets.length} pets, ${Object.keys(sets).length} sets, ${Object.keys(rings).length} rings`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
