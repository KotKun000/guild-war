// ---------- tiny html helpers (auto-escaping) ----------
class Raw {
  constructor(s) {
    this.s = s;
  }
}
const raw = (s) => new Raw(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (v) => (v instanceof Raw ? v.s : Array.isArray(v) ? v.map(fmt).join('') : v === false || v == null ? '' : esc(v));
const html = (strings, ...vals) => raw(strings.reduce((a, s, i) => a + s + (i < vals.length ? fmt(vals[i]) : ''), ''));

const $app = document.getElementById('app');
const $nav = document.getElementById('nav');
const $toast = document.getElementById('toast');

// ---------- constants ----------
const FORMATIONS = { 2: 'พื้นฐาน', 3: 'สมดุล', 1: 'บุก', 4: 'ป้องกัน' };
const STATS = [
  ['atk', 'โจมตี'],
  ['def', 'พลังป้องกัน'],
  ['hp', 'HP'],
  ['spd', 'ความเร็ว'],
  ['critRate', 'อัตราคริ%'],
  ['critDmg', 'คริแดม%'],
  ['weak', 'จุดอ่อน%'],
  ['block', 'บล็อก%'],
  ['hit', 'เข้าเป้า%'],
  ['resist', 'ต้านทาน%'],
  ['dtr', 'ลดดาเมจ%'],
  ['amp', 'เสริมดาเมจ%'],
  ['crush', 'บดขยี้%'],
  ['resil', 'ยืดหยุ่น%'],
  ['rejuv', 'ฟื้นคืน%'],
];
const STAT_LABEL = Object.fromEntries(STATS);
// in-game names (as shown in the hero stat window)
const STAT_FULL = {
  atk: 'พลังโจมตี',
  def: 'พลังป้องกัน',
  hp: 'HP',
  spd: 'ความเร็วโจมตี',
  critRate: 'อัตราคริติคอล',
  critDmg: 'ความเสียหายคริติคอล',
  weak: 'อัตราโจมตีจุดอ่อน',
  block: 'อัตราบล็อก',
  hit: 'ผลเข้าเป้า',
  resist: 'ต้านทานผล',
  dtr: 'ลดความเสียหายที่ได้รับ',
  amp: 'เสริมความเสียหาย',
  crush: 'บดขยี้',
  resil: 'ยืดหยุ่น',
  rejuv: 'ฟื้นคืน',
};
const ROLE_LABEL = { viewer: 'ดูอย่างเดียว', editor: 'แก้ไขได้', admin: 'แอดมิน' };
const DAYS = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
const DAY_SHORT = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
const DAY_KIND = {
  attack: { short: 'ตี', full: 'วันตี', info: 'วันนี้วันตี — เลือกแผนบุก แล้วเข้าตีบ้านศัตรูตามที่วางไว้' },
  defense: { short: 'จัดบ้าน', full: 'วันจัดบ้าน', info: 'วันนี้วันจัดบ้าน — วางทีมป้องกันตามแผนกันให้เรียบร้อย' },
  rest: { short: 'พัก', full: 'วันพัก', info: 'วันนี้วันพัก — ไม่มีวอร์ ใช้เวลาเตรียมทีมและเก็บของ' },
};
// Fixed by the game (Monday first)
const SCHEDULE = ['attack', 'defense', 'attack', 'rest', 'defense', 'attack', 'defense'];

// Thai time (UTC+7, no DST); dow 0 = Monday
function bkkNow() {
  const d = new Date(Date.now() + 7 * 3600e3);
  return { dow: (d.getUTCDay() + 6) % 7, time: d.toISOString().slice(11, 19) };
}

const ICONS = {
  star: '<path class="f" d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  swords: '<path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  users: '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 3.1a4 4 0 0 1 0 7.8M21 21v-2a4 4 0 0 0-3-3.9"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  log: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>',
  speed: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5z"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
};
const icon = (name, cls = '') =>
  raw(`<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`);
const IDLE_LOCK_MS = 30 * 60e3;
// every enemy house has exactly one type tag; other tags are secondary (max 5)
const TYPE_TAGS = ['กายภาพ', 'เวท', 'แทงก์'];
const TYPE_CLASS = { กายภาพ: 'phys', เวท: 'magic', แทงก์: 'tank' };
const TAG_ALIASES = { โจมตี: 'กายภาพ', เวทย์: 'เวท', ถึก: 'แทงก์' }; // older tag names in imported data
const SECONDARY_PRESETS = ['ความเร็ว', 'ต้องการของดี'];
const MAX_SECONDARY = 5;
const normTags = (tags) => [...new Set((tags || []).map((x) => TAG_ALIASES[x] || x))];
const typeTagOf = (tags) => normTags(tags).find((x) => TYPE_TAGS.includes(x));
const tagPill = (x) => html`<span class="tag ${TYPE_CLASS[x] ? `tt-${TYPE_CLASS[x]}` : 'tt-sub'}">${x}</span>`;
// type tag first, then secondary tags
const sortedTags = (tags) => normTags(tags).sort((a, b) => TYPE_TAGS.includes(b) - TYPE_TAGS.includes(a));

// type tags behave like radio buttons; secondary tags are capped at MAX_SECONDARY
function toggleTag(t) {
  const tags = state.edit.tags;
  if (tags.includes(t)) return tags.splice(tags.indexOf(t), 1);
  if (TYPE_TAGS.includes(t)) {
    const old = tags.findIndex((x) => TYPE_TAGS.includes(x));
    if (old >= 0) tags.splice(old, 1);
    return tags.unshift(t);
  }
  if (tags.filter((x) => !TYPE_TAGS.includes(x)).length >= MAX_SECONDARY) return toast(`แท็กรองได้สูงสุด ${MAX_SECONDARY} อัน`, true);
  tags.push(t);
}

function timeAgo(ts) {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return 'เมื่อครู่';
  if (s < 3600) return `${Math.floor(s / 60)} นาที`;
  if (s < 86400) return `${Math.floor(s / 3600)} ชม.`;
  if (s < 30 * 86400) return `${Math.floor(s / 86400)} วัน`;
  return new Date(ts).toLocaleDateString('th-TH', { dateStyle: 'short' });
}
const agoBadge = (ts) =>
  html`<span class="ago ${Date.now() - ts < 86400e3 ? 'fresh' : ''}" title="แก้ไขล่าสุด ${fmtDate(ts)}"><i></i>${timeAgo(ts)}</span>`;
const NEXT_KEY = 'egg2k:next';

// Unlock token is kept in memory only: reloading / closing the tab always asks for the password again.
const state = {
  me: null,
  passwordSet: false,
  token: null,
  exp: 0,
  data: null,
  edit: null,
  admin: null,
  lastActive: Date.now(),
  q: '',
  tag: '',
  // team editor
  sel: null, // { team: path, field: 'slots' | 'pet' | 'extras', i, auto? }
  activeTeam: null,
  modal: null, // { kind: 'grid' | 'filter' | 'formation' | 'skills', team?, skills? }
  step: 2,
  planWiz: null, // { si, oi, step, snapshot, fresh }
  dock: { tab: 'hero', q: '', rarity: '', type: '', petRarity: '', search: false, collapsed: false },
};

// ---------- game assets (self-hosted images, see scripts/fetch-assets.mjs) ----------
const AS = { hero: new Map(), pet: new Map(), heroes: [], pets: [], sets: {}, rings: {} };
const AWAKE_RE = /^(.*?)(\s+awake(?:\s+epic)?)?$/i;

function buildAssets(a) {
  Object.assign(AS, {
    heroes: a.heroes,
    pets: a.pets,
    sets: a.sets || {},
    rings: a.rings || {},
    types: a.types || {},
    skills: a.skills || {},
    stats: a.stats || {},
    awakeBadge: a.awakeBadge || null,
  });
  for (const h of a.heroes) for (const n of h.aliases) AS.hero.set(n, h);
  for (const p of a.pets) for (const n of p.aliases) AS.pet.set(n, p);
}

function heroInfo(name) {
  const [, base, awk] = AWAKE_RE.exec(name || '');
  const h = AS.hero.get(base);
  return { base, awake: !!awk, img: h ? (awk && h.awk) || h.img : null };
}

const portrait = (img, cls = '') => (img ? html`<img class="${cls}" src="${img}" alt="" loading="lazy" />` : '');
const petChip = (name) => html`<span class="chip pet">${portrait(AS.pet.get(name)?.img, 'ico')}${name}</span>`;
const iconChip = (img, label) => html`<span class="chip">${portrait(img, 'ico')}${label}</span>`;

// ---------- api ----------
class ApiError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
  }
}

async function api(method, path, body) {
  const res = await fetch('/api' + path, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(state.token ? { 'X-Unlock': state.token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    state.me = null;
    lock(false);
  } else if (res.status === 423) lock();
  if (!res.ok) throw new ApiError(res.status, data.error || 'error');
  return data;
}

function toast(msg, isError = false) {
  $toast.textContent = msg;
  $toast.className = 'toast' + (isError ? ' error' : '');
  $toast.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => ($toast.hidden = true), 3000);
}

const errMsg = (e) =>
  ({
    forbidden: 'ไม่มีสิทธิ์ทำรายการนี้',
    wrong_password: 'รหัสไม่ถูกต้อง',
    password_length: 'รหัสต้องยาว 8-128 ตัวอักษร',
    invalid_discord_id: 'Discord ID ไม่ถูกต้อง',
    cannot_edit_self: 'แก้ไขสิทธิ์ตัวเองไม่ได้',
    title_required: 'กรุณาใส่ชื่อแผน',
    fetch_failed: 'ดึงข้อมูลจาก 7k-note ไม่สำเร็จ',
    invalid_json: 'รูปแบบ JSON ไม่ถูกต้อง',
  })[e.message] || `เกิดข้อผิดพลาด (${e.message})`;

// ---------- auth flow ----------
function lock(rerender = true) {
  state.token = null;
  state.exp = 0;
  state.data = null;
  state.edit = null;
  state.admin = null;
  if (rerender) render();
}

function setUnlock(r) {
  state.token = r.token;
  state.exp = r.expiresAt;
  state.lastActive = Date.now();
}

async function adminUnlock() {
  setUnlock(await api('POST', '/unlock', { bypass: true }));
}

async function boot() {
  const err = new URLSearchParams(location.search).get('error');
  if (err) {
    history.replaceState(null, '', '/' + location.hash);
    toast({ denied: 'บัญชี Discord นี้ยังไม่ได้รับสิทธิ์ ติดต่อแอดมินกิลด์', state: 'เข้าสู่ระบบไม่สำเร็จ ลองใหม่อีกครั้ง' }[err] || 'เข้าสู่ระบบไม่สำเร็จ', true);
  }
  fetch('/assets.json')
    .then((r) => r.json())
    .then((a) => (buildAssets(a), state.token && render()))
    .catch(() => {});
  try {
    const r = await api('GET', '/me');
    state.me = r.user;
    state.passwordSet = r.passwordSet;
    state.bypass = r.bypass;
    // admins with Discord 2FA skip the guild password
    if (r.bypass && r.passwordSet) await adminUnlock().catch(() => {});
  } catch {
    state.me = null;
  }
  render();
}

async function loadData() {
  state.data = await api('GET', '/data');
}

for (const ev of ['pointerdown', 'keydown', 'scroll']) addEventListener(ev, () => (state.lastActive = Date.now()), { passive: true });
setInterval(() => {
  if (state.token && (Date.now() > state.exp || Date.now() - state.lastActive > IDLE_LOCK_MS)) {
    lock();
    toast('ล็อคอัตโนมัติ กรุณาใส่รหัสอีกครั้ง');
  }
}, 15e3);

// ---------- helpers ----------
const can = (role) => ['viewer', 'editor', 'admin'].indexOf(state.me?.role) >= ['viewer', 'editor', 'admin'].indexOf(role);
const clone = (o) => JSON.parse(JSON.stringify(o));
const heroesOf = (team) => (team?.slots || []).filter(Boolean);
const fmtDate = (ts) => (ts ? new Date(ts).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-');
const findTarget = (id) => state.data?.targets.find((t) => t.id === id);
const findPlan = (id) => state.data?.plans.find((p) => p.id === id);
const emptyTeam = () => ({ front: 2, slots: [null, null, null, null, null], pet: null, extras: [null, null, null, null], speed: 0 });
const emptyOption = () => ({ team: emptyTeam(), skills: [], heroNotes: [], condition: '', notes: '' });
const noteFilled = (n) => !!(n && (n.text || n.sets?.length || n.rings?.length || Object.keys(n.stats || {}).length));
const LAST_PREFIX = 'egg2k:last:';
function readLastStats(base) {
  try {
    const v = localStorage.getItem(LAST_PREFIX + base);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}
function rememberHeroNotes(notes) {
  try {
    for (const n of notes || []) {
      if (!n?.hero || (!n.sets?.length && !n.rings?.length && !Object.keys(n.stats || {}).length)) continue;
      localStorage.setItem(
        LAST_PREFIX + heroInfo(n.hero).base,
        JSON.stringify({ stats: n.stats || {}, sets: n.sets || [], rings: n.rings || [], ts: Date.now() }),
      );
    }
  } catch {
    /* private mode / quota */
  }
}

function allNames() {
  const heroes = new Set();
  const pets = new Set();
  const sets = new Set();
  const rings = new Set();
  const tags = new Set();
  const addTeam = (t) => {
    heroesOf(t).forEach((h) => heroes.add(h));
    [t?.pet, ...(t?.extras || [])].filter(Boolean).forEach((p) => pets.add(p));
  };
  const addNotes = (ns) => (ns || []).forEach((n) => (n.sets.forEach((s) => sets.add(s)), n.rings.forEach((s) => rings.add(s))));
  for (const t of state.data?.targets || []) {
    addTeam(t.team);
    t.tags.forEach((x) => tags.add(x));
    t.counters.forEach((c) => (addTeam(c.team), addNotes(c.heroNotes)));
  }
  for (const p of state.data?.plans || []) for (const s of p.data.slots || []) for (const o of s.options || []) addTeam(o.team), addNotes(o.heroNotes);
  AS.heroes.forEach((h) => heroes.add(h.name));
  Object.keys(AS.sets).forEach((s) => sets.add(s));
  Object.keys(AS.rings).forEach((s) => rings.add(s));
  const sort = (s) => [...s].sort((a, b) => a.localeCompare(b, 'th'));
  return { heroes: sort(heroes), pets: sort(pets), sets: sort(sets), rings: sort(rings), tags: sort(tags) };
}

function datalists() {
  const n = allNames();
  const dl = (id, arr) => html`<datalist id="${id}">${arr.map((x) => html`<option value="${x}"></option>`)}</datalist>`;
  return html`${dl('dl-heroes', n.heroes)}${dl('dl-pets', n.pets)}${dl('dl-sets', n.sets)}${dl('dl-rings', n.rings)}${dl('dl-tags', n.tags)}`;
}

async function copyLink(hash) {
  const url = `${location.origin}/${hash}`;
  try {
    await navigator.clipboard.writeText(url);
    toast('คัดลอกลิงก์แล้ว — ผู้เปิดต้อง Login Discord และใส่รหัสกิลด์ก่อนดู');
  } catch {
    prompt('คัดลอกลิงก์นี้', url);
  }
}

// ---------- team board (in-game layout: front column · back column · pet/formation/skills) ----------
const MAX_HEROES = 3;
const MAX_SKILLS = 3;
const SKILL_LABEL = { 1: 'บน', 2: 'ล่าง', 3: 'อเวค' };
const RARITY_GROUPS = [
  ['L++', 'O7K · Seven Knights of Old', 'O7K'],
  ['L+', 'ทองบน (L+)', 'ทองบน'],
  ['L', 'ทองล่าง (L)', 'ทองล่าง'],
  ['R', 'ม่วง (R)', 'ม่วง'],
];
const TYPES = [
  ['Attack', 'โจมตี'],
  ['Magic', 'เวท'],
  ['Defense', 'ป้องกัน'],
  ['Support', 'สนับสนุน'],
  ['Universal', 'สมดุล'],
];

// ---------- unit cards / orbs (in-game look) ----------
const ORDER_CLASS = ['o1', 'o2', 'o3'];
const SKILL_KIND = { '03': 1, '02': 2, '06': 3 }; // 7K Note skill file suffix -> our skill number (1 บน, 2 ล่าง, 3 อเวค)
const SKILL_ORDER = [3, 1, 2]; // display order in the skill queue: อเวค, บน, ล่าง
const PCT_STATS = new Set(['critRate', 'critDmg', 'weak', 'block', 'hit', 'resist', 'dtr', 'amp', 'crush', 'resil', 'rejuv']);
const SPARK = 'M0-12C1.4-3.2 3.2-1.4 12 0C3.2 1.4 1.4 3.2 0 12C-1.4 3.2-3.2 1.4-12 0C-3.2-1.4-1.4-3.2 0-12Z';

// skills of a hero (awake form adds the อเวค skill): [{ n, name, img }]
function skillsOf(name) {
  const info = heroInfo(name);
  const h = AS.hero.get(info.base);
  const suffix = (name || '').slice(info.base.length);
  // last resort: heroes without a separate "awake" entry keep all their skills (incl. the awake one) under the plain name
  const keys = [name, ...(h?.aliases || []).map((a) => a + suffix), ...(h?.aliases || []).map((a) => (info.awake ? `${a} awake` : a)), ...(h?.aliases || [])];
  for (const k of keys) {
    const list = AS.skills?.[k];
    if (list) return list.filter(Boolean).map((s) => ({ n: SKILL_KIND[s.kind], name: s.name, img: s.img })).filter((s) => s.n).sort((a, b) => SKILL_ORDER.indexOf(a.n) - SKILL_ORDER.indexOf(b.n));
  }
  return [...(info.awake ? [3] : []), 1, 2].map((n) => ({ n, name: SKILL_LABEL[n], img: null }));
}
const skillInfo = (heroName, n) => skillsOf(heroName).find((s) => s.n === n) || { n, name: SKILL_LABEL[n], img: null };

const spark = (x, y, cls, s = 0.62) => raw(`<path class="${cls}" transform="translate(${x} ${y}) scale(${s})" d="${SPARK}"/>`);
const orbRing = raw('<circle cx="50" cy="50" r="44" class="orb-ring"/>');

// star columns like 7K Note: n stars step down-left, fewer stars = bigger stars
const FORM_SPARK = 'M0-12 C1 -3 3 -1 12 0 C3 1 1 3 0 12 C-1 3 -3 1 -12 0 C-3 -1 -1 -3 0-12Z';
const FORM_SCALE = { 1: 0.82, 2: 0.82, 3: 0.72, 4: 0.62 };
const FORM_GAP = { 1: 0, 2: 18, 3: 16, 4: 13 };
function formationColumn(n, x0, cls) {
  return [...Array(n).keys()].map((i) => {
    const x = x0 + 1.25 * (n - 1) - 2.5 * i;
    const y = 50 + (i - (n - 1) / 2) * FORM_GAP[n];
    return raw(`<path class="${cls}" transform="translate(${+x.toFixed(2)} ${+y.toFixed(2)}) scale(${FORM_SCALE[n]})" d="${FORM_SPARK}"/>`);
  });
}

function formationOrb(f) {
  return html`<svg viewBox="0 0 100 100" class="orb-svg">${orbRing}${formationColumn(5 - f, 36, 'sp-back')}${formationColumn(f, 64, 'sp-front')}</svg>`;
}

// formation picker preview (like 7K Note): numbered red pawns = back row, blue shields = front row
const FORMATION_EN = { 2: 'Basic', 3: 'Balanced', 1: 'Attack', 4: 'Protective' };
function formationDiagram(f) {
  const b = 5 - f;
  const pawn = (n, x, y) =>
    `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="9" rx="9" ry="3.5" fill="#9b2c43"/><circle cx="0" cy="-1" r="9.5" fill="url(#gRed)" stroke="#ffe0e6" stroke-width="1.2"/><text y="3.5" text-anchor="middle" font-size="12" font-weight="800" fill="#fff">${n}</text></g>`;
  const shield = (n, x, y) =>
    `<g transform="translate(${x} ${y})"><path d="M0-13 L11-8 L10 4 Q6 11 0 14 Q-6 11 -10 4 L-11-8Z" fill="url(#gBlue)" stroke="#dfe6ff" stroke-width="1.2"/><text y="4" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">${n}</text></g>`;
  const backY0 = 50 + 4 * b;
  const frontY = 68 - 6 * f;
  const back = [...Array(b).keys()].map((j) => pawn(f + 1 + j, 22 + 13 * j, backY0 - 9 * j));
  const front = [...Array(f).keys()].map((i) => shield(i + 1, 80 - 13 * (f - 1 - i), frontY + 9 * (f - 1 - i)));
  return raw(
    `<svg viewBox="0 0 150 90" class="fm-diagram" aria-hidden="true"><defs><linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fb0ff"/><stop offset="1" stop-color="#3453c9"/></linearGradient><linearGradient id="gRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a9a"/><stop offset="1" stop-color="#c02a48"/></linearGradient></defs>${back.join('')}${front.join('')}</svg>`,
  );
}

function skillOrb(count) {
  const pos = [[30, 52], [57, 33], [61, 64]];
  return html`<svg viewBox="0 0 100 100" class="orb-svg">${orbRing}${pos.map(([x, y], i) => spark(x, y, i < count ? 'sp-gold' : 'sp-dim', 1))}</svg>`;
}

// orders: skill-queue positions (0-based) that belong to this hero
const BLOCKED_SVG = raw(
  '<svg viewBox="0 0 100 100" class="blocked-svg" aria-hidden="true"><path d="M15 85 85 15"/><circle cx="15" cy="85" r="3.5"/><circle cx="85" cy="15" r="3.5"/></svg>',
);

// blocked = team already has MAX_HEROES, this empty slot cannot take another hero
function heroCard(name, { cls = '', attrs = raw(''), orders = [], blocked = false } = {}) {
  if (!name && blocked) return html`<div class="ucard empty blocked ${cls}" ${attrs} title="ทีมครบ ${MAX_HEROES} ตัวแล้ว">${BLOCKED_SVG}</div>`;
  if (!name) return html`<div class="ucard empty ${cls}" ${attrs}><span class="plus">+</span></div>`;
  const info = heroInfo(name);
  const h = AS.hero.get(info.base);
  return html`<div class="ucard t-${h?.type || 'none'} ${cls}" title="${name}" ${attrs}>
    <div class="art">${portrait(info.img)}</div>
    ${h?.type && AS.types?.[h.type] ? html`<span class="role"><img src="${AS.types[h.type]}" alt="" /></span>` : ''}
    ${info.awake && AS.awakeBadge ? html`<img class="awk-badge" src="${AS.awakeBadge}" alt="อเวค" title="อเวค" />` : info.awake ? html`<span class="awk">AWK</span>` : ''}
    <span class="nm">${info.base}</span>
    ${orders.length ? html`<span class="ords">${orders.map((o) => html`<b class="ord ${ORDER_CLASS[o]}">${o + 1}</b>`)}</span>` : ''}
  </div>`;
}

function petCard(name, cls = '') {
  const p = AS.pet.get(name);
  if (!name) return html`<div class="ucard pet empty ${cls}"><span class="plus">+</span></div>`;
  return html`<div class="ucard pet ${cls}" title="${name}"><div class="art">${p ? portrait(p.img) : ''}</div><span class="nm">${name}</span></div>`;
}

// edit = { prefix, skillsPath } turns the board into an editor; view = { key } makes heroes open the detail modal.
// mirror = back row on the left (attacking side facing the enemy).
function board(team, skills, title = '', edit = null, { view = null, mirror = false, tone = '' } = {}) {
  const f = team.front || 2;
  const sel = state.sel;
  const isSel = (field, i) => edit && sel && sel.team === edit.prefix && sel.field === field && (field === 'pet' || sel.i === i);
  const act = (action, extra = '') => (edit ? raw(`role="button" tabindex="0" data-action="${action}" data-team="${esc(edit.prefix)}" ${extra}`) : raw(''));
  const viewAct = (action) => (view ? raw(`role="button" tabindex="0" data-action="${action}" data-key="${esc(view.key)}"`) : raw(''));
  const ordersOf = (i) => skills.map((s, o) => (s.slot === i ? o : -1)).filter((o) => o >= 0);
  const full = heroesOf(team).length >= MAX_HEROES;
  const slot = (i) =>
    html`<div class="slot-wrap">${heroCard(team.slots[i], {
      blocked: full,
      cls: isSel('slots', i) ? 'selected' : '',
      attrs: edit ? act('slot', `data-field="slots" data-i="${i}"`) : team.slots[i] && !view?.noHero ? viewAct('open-detail') : raw(''),
      orders: ordersOf(i),
    })}
      ${edit && team.slots[i] ? html`<button type="button" class="x" data-action="slot-clear" data-team="${edit.prefix}" data-field="slots" data-i="${i}" title="เอาออก">×</button>` : ''}
      ${edit && team.slots[i] && AS.hero.get(heroInfo(team.slots[i]).base)?.awk ? html`<button type="button" class="awk-toggle" data-action="toggle-awk" data-team="${edit.prefix}" data-i="${i}" title="สลับร่างปกติ/อเวค">⟳</button>` : ''}
    </div>`;
  const petSlot = (field, i, value, small) =>
    html`<div class="slot-wrap" ${act('slot', `data-field="${field}" data-i="${i}"`)}>${petCard(value, `${small ? 'small' : ''} ${isSel(field, i) ? 'selected' : ''}`)}</div>`;
  const front = html`<div class="col front">${[...Array(f).keys()].map(slot)}<span class="col-label">หน้า</span></div>`;
  const back = html`<div class="col back">${[...Array(5 - f).keys()].map((i) => slot(i + f))}<span class="col-label">หลัง</span></div>`;
  const skillAttrs = edit ? act('open-skills', `data-skills="${esc(edit.skillsPath)}"`) : view && skills.length ? viewAct('open-skillview') : raw('');
  return html`<div class="board ${tone} ${edit && state.activeTeam === edit.prefix ? 'active' : ''}">
    <div class="board-head">
      <b>${title}</b>
      ${edit ? html`<button type="button" class="btn icon ghost small" data-action="team-reset" data-team="${edit.prefix}" data-skills="${edit.skillsPath}" title="ล้างทีม">${icon('reset')}</button>` : ''}
    </div>
    <div class="board-top">
      ${edit
        ? html`<label class="speed-in">${icon('speed')}<input type="number" min="0" value="${team.speed || ''}" placeholder="0" data-bind="${edit.prefix}.speed" data-type="num" /></label>`
        : html`<span class="speed-in ${view ? 'clickable' : ''}" ${view ? viewAct('open-speed') : raw('')}>${icon('speed')}<b>${team.speed || 0}</b>${view ? icon('down') : ''}</span>`}
    </div>
    <div class="board-grid">
      ${mirror ? html`${back}${front}` : html`${front}${back}`}
      <div class="col side">
        ${petSlot('pet', 0, team.pet)}
        <div class="orb formation ${edit ? 'clickable' : ''}" ${act('open-formation')} title="รูปแบบ${FORMATIONS[f]} · หน้า ${f} หลัง ${5 - f}">${formationOrb(f)}<span class="orb-label">${FORMATIONS[f]}</span></div>
        <div class="orb skills ${edit || (view && skills.length) ? 'clickable' : ''}" ${skillAttrs} title="${skills.length ? `ตั้งลำดับการใช้สกิล ${skills.length} ครั้ง` : 'ตั้งลำดับการใช้สกิล'}">${skillOrb(skills.length)}${skills.length ? html`<span class="orb-label">คิวสกิล</span>` : ''}</div>
      </div>
    </div>
    <div class="reserve"><span>สัตว์เลี้ยงสำรอง</span>${[0, 1, 2, 3].map((i) => petSlot('extras', i, team.extras[i], true))}</div>
  </div>`;
}

const teamView = (team, skills = team?.skills || [], opts = {}) => board(team, skills, opts.title || '', null, opts);

// ---------- hero gear / stat display ----------
const gearSlots = (list, map, n = 3) =>
  html`<div class="gear-slots">${[...Array(n).keys()].map((i) =>
    list[i] ? html`<span class="gear" title="${list[i]}">${map[list[i]] ? html`<img src="${map[list[i]]}" alt="${list[i]}" />` : html`<small>${list[i]}</small>`}</span>` : html`<span class="gear empty"></span>`,
  )}</div>`;

const statPills = (stats) => {
  const st = STATS.filter(([k]) => typeof stats[k] === 'number' && stats[k] !== 0);
  return st.length
    ? html`<dl class="stat-pills">${st.map(
        ([k, l]) => html`<div class="stat-pill"><dt>${AS.stats?.[k] ? html`<img src="${AS.stats[k]}" alt="" />` : ''}<span>${STAT_FULL[k] || l}</span></dt><dd>${stats[k]}${PCT_STATS.has(k) ? '%' : ''}</dd></div>`,
      )}</dl>`
    : html`<p class="muted small">ไม่ได้จดค่าความสามารถ</p>`;
};

function heroNotesView(notes) {
  const list = (notes || []).filter((n) => n.text || n.sets.length || n.rings.length || Object.keys(n.stats).length);
  if (!list.length) return '';
  return html`<ul class="hero-detail">${list.map(heroDetailRow)}</ul>`;
}

const heroDetailRow = (n) => html`<li>
  <div class="hd-left">
    <div class="hd-head">${heroCard(n.hero, { cls: 'md' })}<b>${n.hero}</b></div>
    <div class="lbl">เครื่องประดับ</div>${gearSlots(n.rings, AS.rings || {})}
    <div class="lbl">เซต</div>${gearSlots(n.sets, AS.sets || {})}
  </div>
  <div class="hd-right">${statPills(n.stats)}${n.text ? html`<div class="pre note">${n.text}</div>` : ''}</div>
</li>`;

// ---------- team editor (bound to state.edit via data-bind paths) ----------
function teamEditor(prefix, team, skills, skillsPath, notes, notesPath, title = '') {
  if (!state.activeTeam) state.activeTeam = prefix;
  return html`<div class="team-editor">
    ${board(team, skills, title, { prefix, skillsPath })}
    <p class="board-hint">แตะช่องเพื่อเลือก แล้วแตะการ์ดในแถบด้านล่าง · แตะตัวในทีมแล้วแตะอีกช่องเพื่อสลับ · ใส่ได้ ${MAX_HEROES} ตัว</p>
    ${notes ? notesEditor(notes, notesPath) : ''}
  </div>`;
}

function gearEditSlots(n, path, field, map) {
  const list = n[field] || [];
  return html`<div class="gear-slots">${list.map((v, k) =>
      html`<button type="button" class="gear" data-action="pick-gear" data-path="${path}.${field}" data-k="${k}" data-kind="${field}" title="${v}">
        ${map[v] ? html`<img src="${map[v]}" alt="${v}" />` : html`<small>${v}</small>`}
      </button>`,
    )}${list.length < 3
      ? html`<button type="button" class="gear empty gear-add" data-action="pick-gear" data-path="${path}.${field}" data-k="${list.length}" data-kind="${field}" title="เพิ่ม">
          <span class="plus">+</span>
        </button>`
      : ''}
  </div>`;
}

function lastAgoLabel(ts) {
  const a = timeAgo(ts);
  return a === 'เมื่อครู่' ? a : `${a}ก่อน`;
}

function notesEditor(notes, notesPath, opts = {}) {
  if (!notes?.length) return html`<p class="muted center small">ใส่อัศวินในทีมก่อน แล้วค่อยจดอุปกรณ์/ค่าความสามารถ</p>`;
  return html`<div class="hn-editor">
    <p class="muted small">ใส่อุปกรณ์ ค่าความสามารถ และคำอธิบายของแต่ละตัว (แถวละ 1 ตัว) — ข้ามได้ กด "เสร็จ" ได้เลย</p>
    <div class="hn-toolbar"><button type="button" class="btn small" data-action="pick-saved-notes" data-path="${notesPath}">เลือกจากที่จดไว้</button><button type="button" class="btn small" data-action="open-ocr" data-path="${notesPath}" data-i="0">📷 อ่านค่าจากรูป</button></div>
    <div class="hn-table">
      <div class="hn-head"><span>อัศวิน</span><span>รายละเอียด</span></div>
      ${notes.map((n, i) => {
        n.sets ||= [];
        n.rings ||= [];
        n.stats ||= {};
        const path = `${notesPath}.${i}`;
        const last = readLastStats(heroInfo(n.hero).base);
        const filled = noteFilled(n);
        const hasStats = STATS.some(([k]) => typeof n.stats?.[k] === 'number' && n.stats[k] !== 0);
        return html`<div class="hn-row">
          <div class="hn-left">
            <div class="hd-head">${heroCard(n.hero, { cls: 'md' })}<b>${heroInfo(n.hero).base}</b></div>
            <div class="lbl">เซต</div>${gearEditSlots(n, path, 'sets', AS.sets || {})}
            <div class="lbl">เครื่องประดับ</div>${gearEditSlots(n, path, 'rings', AS.rings || {})}
            ${last ? html`<button type="button" class="btn small" data-action="hn-use-last" data-path="${path}">⟲ ใช้ค่าความสามารถล่าสุดของฉัน (${lastAgoLabel(last.ts)})</button>` : ''}
          </div>
          <div class="hn-right">
            <button type="button" class="hn-x" data-action="hn-clear" data-path="${path}" title="ล้างข้อมูลแถวนี้" ${filled ? '' : raw('disabled')}>×</button>
            <textarea maxlength="300" rows="3" data-bind="${path}.text" placeholder="คำอธิบายตัวนี้">${n.text || ''}</textarea>
            <button type="button" class="btn btn-gold-outline" data-action="open-stats" data-path="${path}">✎ ใส่ค่าความสามารถ</button>
            ${hasStats ? statPills(n.stats) : ''}
            <button type="button" class="btn small ghost" data-action="hn-clear" data-path="${path}" ${filled ? '' : raw('disabled')}>ล้างข้อมูลตัวนี้</button>
          </div>
        </div>`;
      })}
    </div>
    ${opts.notePath
      ? html`<label>โน้ตทีม <textarea maxlength="500" rows="3" data-bind="${opts.notePath}" placeholder="${'โน้ต บรรทัดละ 1 ข้อ เช่น\nความเร็ว 180+ เฟรย่าแบกความเร็ว\nอาริส จุด 100 บล็อค 78'}">${getPath(state.edit, opts.notePath) || ''}</textarea></label>`
      : ''}
  </div>`;
}

// keep heroNotes / skills consistent with heroes in the team
function syncTeam(team, skills, notes) {
  for (let i = skills.length - 1; i >= 0; i--) if (!team.slots[skills[i].slot]) skills.splice(i, 1);
  if (!notes) return;
  const heroes = heroesOf(team);
  // match notes by base name so toggling awake keeps the notes
  const base = (n) => heroInfo(n).base;
  const next = heroes.map((h) => {
    const n = notes.find((x) => x.hero === h) || notes.find((x) => base(x.hero) === base(h));
    return n ? { ...n, hero: h } : { hero: h, text: '', sets: [], rings: [], stats: {} };
  });
  notes.splice(0, notes.length, ...next);
}

// ---------- team editing operations (board + dock) ----------
const teamAt = (prefix) => getPath(state.edit, prefix);
const skillsFor = (prefix) => getPath(state.edit, prefix.replace(/team$/, 'skills'));
const heroBase = (n) => heroInfo(n).base;
const defaultHeroName = (h) => (h.awk ? `${h.name} awake` : h.name);

function placeHero(prefix, value) {
  const team = teamAt(prefix);
  const existing = team.slots.findIndex((n) => n && heroBase(n) === heroBase(value));
  if (existing >= 0) {
    team.slots[existing] = null; // tapping a hero already in the team removes it
    return;
  }
  let i = state.sel?.team === prefix && state.sel.field === 'slots' ? state.sel.i : team.slots.findIndex((n) => !n);
  if (i < 0) return toast('ทีมเต็มแล้ว — เอาตัวออกก่อน', true);
  if (!team.slots[i] && heroesOf(team).length >= MAX_HEROES) return toast(`ใส่ได้สูงสุด ${MAX_HEROES} ตัว`, true);
  team.slots[i] = value;
  const next = team.slots.findIndex((n) => !n);
  state.sel = next >= 0 && heroesOf(team).length < MAX_HEROES ? { team: prefix, field: 'slots', i: next, auto: true } : null;
}

function placePet(prefix, value) {
  const team = teamAt(prefix);
  const sel = state.sel?.team === prefix && state.sel.field !== 'slots' ? state.sel : null;
  if (!sel && [team.pet, ...team.extras].includes(value)) {
    // tapping a pet already in the team removes it
    if (team.pet === value) team.pet = null;
    else team.extras[team.extras.indexOf(value)] = null;
    return;
  }
  if (sel) {
    if (sel.field === 'pet') team.pet = value;
    else team.extras[sel.i] = value;
  } else if (!team.pet) team.pet = value;
  else {
    const i = team.extras.findIndex((n) => !n);
    if (i < 0) return toast('ช่องสัตว์เลี้ยงเต็มแล้ว', true);
    team.extras[i] = value;
  }
  state.sel = null;
}

function swapSlots(prefix, a, b) {
  const team = teamAt(prefix);
  [team.slots[a], team.slots[b]] = [team.slots[b], team.slots[a]];
  for (const s of skillsFor(prefix) || []) s.slot = s.slot === a ? b : s.slot === b ? a : s.slot;
}

const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const o = keys.reduce((o, k) => o[k], obj);
  if (value === undefined) delete o[last];
  else o[last] = value;
}

function readInput(el) {
  const v = el.value;
  switch (el.dataset.type) {
    case 'num':
      return Number(v) || 0;
    case 'stat':
      return v === '' ? undefined : Number(v);
    case 'list':
      return v.split(',').map((s) => s.trim()).filter(Boolean);
    default:
      return el.tagName === 'TEXTAREA' ? v : v.trim() || (el.dataset.bind.match(/(slots|extras)\.\d$|\.pet$/) ? null : '');
  }
}

// ---------- views ----------
function viewLogin() {
  return html`<section class="hero-card frame">
    <div class="kicker">GUILD WAR · SEVEN KNIGHTS RE:BIRTH</div>
    <h1>EGG2K<br /><span class="gold">MEMBERS ONLY.</span></h1>
    <p class="muted">เข้าสู่ระบบด้วย Discord (เฉพาะสมาชิกกิลด์) แล้วใส่รหัสกิลด์ทุกครั้งที่เปิดเว็บ</p>
    <button class="btn discord" data-action="login">เข้าสู่ระบบด้วย Discord</button>
  </section>`;
}


function hqCard() {
  const d = state.data;
  return html`<section class="panel frame hq">
    <div>
      <div class="kicker">GUILD HEADQUARTERS</div>
      <h1>EGG2K</h1>
      <div class="muted small">${d.plans.length} แผนสงคราม · ${d.targets.length} บ้านศัตรู</div>
    </div>
    <div class="actions">
      <button class="btn" data-action="share" data-hash="${location.hash || '#/'}">${icon('link')} แชร์ลิงก์หน้านี้</button>
      ${can('admin') ? html`<a class="btn" href="#/admin">${icon('settings')} ตั้งค่ากิลด์</a>` : ''}
    </div>
  </section>`;
}

function weekCard() {
  const { dow } = bkkNow();
  const kind = SCHEDULE[dow];
  return html`<section class="panel frame week">
    <div class="week-head">
      <h3>${icon('calendar')} วัน${DAYS[dow]} <span class="pill ${kind}">${DAY_KIND[kind].full}</span></h3>
      <div class="days">${SCHEDULE.map(
        (k, i) => html`<div class="day ${k} ${i === dow ? 'today' : ''}" title="วัน${DAYS[i]}: ${DAY_KIND[k].full}"><b>${DAY_SHORT[i]}</b><span>${DAY_KIND[k].short}</span></div>`,
      )}</div>
    </div>
    <div class="week-info">${DAY_KIND[kind].info}</div>
  </section>`;
}

function homeTabs(active) {
  const d = state.data;
  return html`<nav class="seg">
    <a href="#/" class="${active === 'targets' ? 'active' : ''}">${icon('swords')} บ้านศัตรู <span class="n">${d.targets.length}</span></a>
    <a href="#/plans" class="${active === 'plans' ? 'active' : ''}">${icon('clipboard')} แผนสงคราม <span class="n">${d.plans.length}</span></a>
  </nav>`;
}

const homeTop = (active) => html`${hqCard()}${weekCard()}${homeTabs(active)}`;

const emptyState = (ic, title, text) => html`<div class="panel frame empty">${icon(ic)}<div><b>${title}</b><span class="muted small">${text}</span></div></div>`;

function viewUnlock() {
  if (!state.passwordSet) {
    return can('admin')
      ? html`<section class="hero-card narrow frame">
          <div class="lock-icon">${icon('key')}</div>
          <h2>ตั้งรหัสกิลด์ครั้งแรก</h2>
          <p class="muted">สมาชิกทุกคนต้องใช้รหัสนี้ทุกครั้งที่เปิดเว็บ (อย่างน้อย 8 ตัวอักษร)</p>
          <form data-form="setup">
            <input type="password" name="password" placeholder="รหัสใหม่" autocomplete="new-password" required minlength="8" />
            <input type="password" name="confirm" placeholder="ยืนยันรหัส" autocomplete="new-password" required minlength="8" />
            <button class="btn primary">บันทึกรหัส</button>
          </form>
        </section>`
      : html`<section class="hero-card narrow frame"><div class="lock-icon">${icon('lock')}</div><h2>ยังไม่ได้ตั้งรหัสกิลด์</h2><p class="muted">รอแอดมินตั้งรหัสก่อนใช้งาน</p></section>`;
  }
  return html`<section class="hero-card narrow frame">
    <div class="lock-icon">${icon('lock')}</div>
    <div class="who">${state.me.avatar ? html`<img src="${state.me.avatar}" alt="" />` : ''} ${state.me.name}</div>
    <h2>ใส่รหัสกิลด์</h2>
    ${state.bypass ? html`<button class="btn primary block" data-action="admin-unlock">${icon('key')} เข้าด้วยสิทธิ์แอดมิน (Discord 2FA)</button><p class="muted small">หรือใส่รหัสกิลด์</p>` : ''}
    <form data-form="unlock">
      <input type="password" name="password" placeholder="รหัสกิลด์" autocomplete="current-password" required autofocus />
      <button class="btn primary">ปลดล็อค</button>
    </form>
    <p class="muted small">รหัสจะถูกถามทุกครั้งที่เปิด/รีเฟรชหน้าเว็บ และล็อคอัตโนมัติเมื่อไม่ได้ใช้งาน 30 นาที</p>
  </section>`;
}

function targetCard(t) {
  const type = typeTagOf(t.tags);
  return html`<a class="card tcard ${type ? `tc-${TYPE_CLASS[type]}` : ''}" href="#/t/${t.id}">
    <div class="tc-head">
      <div class="tc-tags">${sortedTags(t.tags).map(tagPill)}</div>
      ${agoBadge(t.updatedAt)}
      <span class="count">${icon('swords')} ${t.counters.length} ทีมแก้</span>
    </div>
    ${teamView(t.team)}
  </a>`;
}

function viewTargets() {
  const q = state.q.trim().toLowerCase();
  const used = new Set(state.data.targets.flatMap((t) => normTags(t.tags)));
  const chips = [...TYPE_TAGS, ...SECONDARY_PRESETS.filter((x) => used.has(x)), ...[...used].filter((x) => !TYPE_TAGS.includes(x) && !SECONDARY_PRESETS.includes(x)).sort()];
  const list = state.data.targets.filter((t) => {
    if (state.tag && !normTags(t.tags).includes(state.tag)) return false;
    if (!q) return true;
    const hay = [...heroesOf(t.team), t.team.pet, ...normTags(t.tags), t.note].join(' ').toLowerCase();
    return q.split(/\s+/).every((w) => hay.includes(w));
  });
  return html`${homeTop('targets')}
    <div class="section-head attack">
      <h2>${icon('swords')} บ้านศัตรู <span class="n">${list.length} ทีม</span></h2>
      ${can('editor') ? html`<a class="btn primary" href="#/new">${icon('plus')} เพิ่มบ้านศัตรู</a>` : ''}
    </div>
    <div class="filters">
      <label class="search-box">${icon('search')}<input type="search" placeholder="ค้นหาชื่ออัศวิน, โน้ต, แท็ก..." value="${state.q}" data-filter="q" list="dl-heroes" /></label>
      <div class="chips">
        <button type="button" class="chip-btn ${state.tag ? '' : 'on'}" data-action="tag-filter" data-tag="">ทั้งหมด</button>
        ${chips.map((x) => html`<button type="button" class="chip-btn ${TYPE_CLASS[x] ? `tt-${TYPE_CLASS[x]}` : ''} ${state.tag === x ? 'on' : ''}" data-action="tag-filter" data-tag="${x}">${x}</button>`)}
      </div>
    </div>
    ${datalists()}
    ${list.length
      ? html`<div class="cards">${list.map(targetCard)}</div>`
      : state.data.targets.length
        ? emptyState('search', 'ไม่พบทีมที่ค้นหา', 'ลองค้นหาด้วยชื่ออื่น หรือล้างตัวกรอง')
        : emptyState('swords', 'ยังไม่มีบ้านศัตรู', 'กด "เพิ่มบ้านศัตรู" เพื่อจดทีมป้องกันของกิลด์คู่แข่ง แล้วเพิ่มทีมแก้ให้สมาชิก')}`;
}

function viewTarget(id) {
  const t = findTarget(id);
  if (!t) return html`<p class="center muted">ไม่พบทีมนี้ (อาจถูกลบไปแล้ว)</p>`;
  const by = (uid) => state.data.names[uid] || '';
  const n = t.counters.length;
  const ci = state.ci === 'all' ? 'all' : Math.min(state.ci || 0, Math.max(n - 1, 0));
  const c = ci === 'all' ? null : t.counters[ci];
  const enemyBoard = teamView(t.team, t.team.skills || [], { view: { key: `t:${t.id}` }, tone: 'enemy' });
  const counterNote = (c, i) => html`<div class="panel frame note-card">
    <div class="note-head"><b class="gold">ทีมแก้ #${i + 1}</b><span class="muted small">${by(c.createdBy)} · ${fmtDate(c.updatedAt)}</span>
      ${can('editor') ? html`<span class="spacer"></span><a class="btn icon small" href="#/t/${t.id}/c/${c.id}/edit" title="แก้ไข">${icon('edit')}</a><button class="btn icon small danger" data-action="del-counter" data-id="${c.id}" title="ลบ">${icon('trash')}</button>` : ''}
    </div>
    ${c.note ? html`<div class="pre">${c.note}</div>` : html`<p class="muted">ไม่มีโน้ต</p>`}
    <button type="button" class="btn block" data-action="open-detail" data-key="c:${c.id}">${icon('users')} ดูรายละเอียดทีมแก้ #${i + 1} (${heroesOf(c.team).length})</button>
  </div>`;

  return html`<div class="toolbar">
      <a class="btn ghost" href="#/">${icon('back')} EGG2K</a>
      <span class="spacer"></span>
      <button class="btn small" data-action="share" data-hash="#/t/${t.id}">${icon('link')} แชร์ลิงก์</button>
      ${can('editor') ? html`<a class="btn small" href="#/t/${t.id}/edit">${icon('edit')} แก้บ้านศัตรู</a><button class="btn small danger" data-action="del-target" data-id="${t.id}">${icon('trash')}</button>` : ''}
    </div>
    <nav class="ctabs">
      <div class="seg">${t.counters.map(
        (x, i) => html`<a href="#" class="${ci === i ? 'active' : ''}" data-action="counter-tab" data-i="${i}">${i === 0 ? '♛ ' : ''}ทีมแก้ #${i + 1}${Date.now() - x.createdAt < 3 * 864e5 ? html` <em class="new">ใหม่</em>` : ''}</a>`,
      )}</div>
      ${n > 1 ? html`<a href="#" class="btn ${ci === 'all' ? 'primary' : ''}" data-action="counter-tab" data-i="all">${icon('grid')} ดูทั้งหมด</a>` : ''}
      ${can('editor') ? html`<a class="btn primary" href="#/t/${t.id}/c/new">${icon('plus')} เพิ่มทีมแก้</a>` : ''}
    </nav>
    ${ci === 'all'
      ? html`<div class="all-counters">${t.counters.map(
          (x, i) => html`<div class="ac-item">${teamView(x.team, x.skills, { title: `ทีมแก้ #${i + 1}`, view: { key: `c:${x.id}` }, mirror: true })}${counterNote(x, i)}</div>`,
        )}</div>`
      : html`<div class="vs-wrap">
          <div class="vs-side"><h3 class="side-title gold">${c ? `ทีมแก้ #${ci + 1}` : 'ทีมแก้'}</h3>
            ${c
              ? html`${teamView(c.team, c.skills, { view: { key: `c:${c.id}` }, mirror: true })}<p class="board-hint">กดอัศวินเพื่อดูค่าความสามารถและอุปกรณ์</p>`
              : html`<div class="board empty-board"><p class="muted">ยังไม่มีทีมแก้สำหรับบ้านนี้</p>${can('editor') ? html`<a class="btn primary" href="#/t/${t.id}/c/new">${icon('plus')} เพิ่มทีมแก้</a>` : ''}</div>`}
          </div>
          <div class="vs-mark" aria-hidden="true"><span>VS</span></div>
          <div class="vs-side"><h3 class="side-title enemy-title">บ้านศัตรู</h3>${enemyBoard}</div>
        </div>
        <div class="notes-row">
          ${c ? counterNote(c, ci) : ''}
          <div class="panel frame note-card enemy">
            <div class="note-head"><b>บ้านศัตรู</b>${agoBadge(t.updatedAt)}</div>
            ${t.tags.length ? html`<div class="tags">${sortedTags(t.tags).map(tagPill)}</div>` : ''}
            ${t.note ? html`<div class="pre">${t.note}</div>` : html`<p class="muted">ไม่มีโน้ต</p>`}
          </div>
        </div>`}`;
}

function viewTargetEdit(id) {
  if (!state.edit || state.edit.__key !== `t:${id}`) {
    const t = id === 'new' ? null : findTarget(id);
    if (id !== 'new' && !t) return html`<p class="center muted">ไม่พบทีม</p>`;
    const team = t ? clone(t.team) : emptyTeam();
    state.edit = { __key: `t:${id}`, team, skills: team.skills || [], tags: t ? normTags(t.tags) : [], note: t?.note || '' };
  }
  const e = state.edit;
  syncTeam(e.team, e.skills);
  const used = state.data.targets.flatMap((t) => normTags(t.tags));
  const secondary = [...new Set([...SECONDARY_PRESETS, ...used, ...e.tags])].filter((x) => !TYPE_TAGS.includes(x));
  const nSec = e.tags.filter((x) => !TYPE_TAGS.includes(x)).length;
  return html`${datalists()}<div class="toolbar"><a class="btn ghost" href="${id === 'new' ? '#/' : `#/t/${id}`}">${icon('back')} ยกเลิก</a><h2>${id === 'new' ? 'เพิ่มบ้านศัตรู' : 'แก้ไขบ้านศัตรู'}</h2></div>
    <div class="edit-2col">
      <div><h3 class="side-title enemy-title">${id === 'new' ? 'บ้านศัตรูใหม่' : 'บ้านศัตรู'}</h3>${teamEditor('team', e.team, e.skills, 'skills', null, null, '')}</div>
      <div><h3 class="side-title enemy-title">รายละเอียดบ้านศัตรู</h3>
        <div class="panel frame">
          ${state.data.targets.length ? html`<button type="button" class="btn small" data-action="modal" data-modal="copy-target">${icon('clipboard')} เลือกจากที่จดไว้</button>` : ''}
          <div class="lbl">ประเภทบ้าน · <span class="${typeTagOf(e.tags) ? 'muted' : 'gold'}">ต้องเลือก 1 อย่าง: กายภาพ / เวท / แทงก์</span></div>
          <div class="tag-pick">
            ${TYPE_TAGS.map((x) => html`<button type="button" class="tagbtn type tt-${TYPE_CLASS[x]} ${e.tags.includes(x) ? 'on' : ''}" data-action="tag-toggle" data-tag="${x}">${e.tags.includes(x) ? '✓' : ''} ${x}</button>`)}
          </div>
          <div class="lbl">แท็กรอง (สูงสุด ${MAX_SECONDARY}) · <span class="muted">${nSec}/${MAX_SECONDARY}</span></div>
          <div class="tag-pick">
            ${secondary.map((x) => html`<button type="button" class="tagbtn ${e.tags.includes(x) ? 'on' : ''}" data-action="tag-toggle" data-tag="${x}">${e.tags.includes(x) ? '✓' : '+'} ${x}</button>`)}
            ${nSec < MAX_SECONDARY ? html`<input class="tag-in" placeholder="แท็กอื่น + Enter" data-tag-input />` : ''}
          </div>
          <label>โน้ต <textarea rows="6" data-bind="note" placeholder="โน้ตบ้านศัตรู เช่น เจอบ่อยในกิลด์ X, ตัวหลังความเร็วสูง">${e.note}</textarea></label>
        </div>
      </div>
    </div>
    <div class="sticky-actions"><a class="btn ghost" href="${id === 'new' ? '#/' : `#/t/${id}`}">ยกเลิก</a><button class="btn primary" data-action="save-target" data-id="${id}">บันทึก</button></div>`;
}

const STEPS = ['บ้านที่จะตี', 'ทีมแก้', 'อุปกรณ์/ค่าความสามารถ'];
const PLAN_STEPS = ['บ้านกัน', 'อุปกรณ์/ค่าความสามารถ'];
const stepNav = (labels, step, action) =>
  html`<nav class="steps">${labels.map(
    (l, i) => html`${i ? html`<span class="sep">›</span>` : ''}<a href="#" class="${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}" data-action="${action}" data-step="${i + 1}"><b>${i + 1}</b> ${l}</a>`,
  )}</nav>`;
const stepTabs = () => stepNav(STEPS, state.step, 'step');

function viewCounterEdit(tid, cid) {
  const t = findTarget(tid);
  if (!t) return html`<p class="center muted">ไม่พบทีม</p>`;
  if (!state.edit || state.edit.__key !== `c:${cid}`) {
    const c = cid === 'new' ? null : t.counters.find((x) => x.id === cid);
    if (cid !== 'new' && !c) return html`<p class="center muted">ไม่พบทีมแก้</p>`;
    state.edit = c ? { __key: `c:${cid}`, ...clone(c) } : { __key: 'c:new', team: emptyTeam(), skills: [], heroNotes: [], note: '' };
  }
  const e = state.edit;
  syncTeam(e.team, e.skills, e.heroNotes);
  const s = state.step;
  return html`${datalists()}<div class="toolbar"><a class="btn ghost" href="#/t/${tid}">${icon('back')} ยกเลิก</a><h2>${cid === 'new' ? 'เพิ่มทีมแก้' : 'แก้ไขทีมแก้'}</h2></div>
    ${stepTabs()}
    ${s === 1
      ? html`<div class="panel enemy frame editor-panel"><div class="board-title">บ้านที่จะตี</div>${teamView(t.team)}${t.note ? html`<div class="pre note">${t.note}</div>` : ''}</div>`
      : s === 2
        ? html`<div class="vs-strip"><span class="muted small">VS</span>${heroesOf(t.team).map((n) => heroCard(n, { cls: 'mini' }))}</div>
          <div class="panel frame editor-panel">
            ${teamEditor('team', e.team, e.skills, 'skills', null, null, 'ทีมแก้')}
            <label>โน้ตทีม <textarea rows="3" data-bind="note" placeholder="เช่น ลำดับการกด ต้องให้ใครเร็วกว่า">${e.note}</textarea></label>
          </div>`
        : html`<div class="panel frame editor-panel">${notesEditor(e.heroNotes, 'heroNotes')}</div>`}
    <div class="sticky-actions">
      <a class="btn ghost" href="#/t/${tid}">ยกเลิก</a>
      <span class="spacer"></span>
      ${s > 1 ? html`<button class="btn" data-action="step" data-step="${s - 1}">ย้อนกลับ</button>` : ''}
      ${s < 3 ? html`<button class="btn" data-action="step" data-step="${s + 1}">ถัดไป</button>` : ''}
      <button class="btn primary" data-action="save-counter" data-tid="${tid}" data-id="${cid}">บันทึก</button>
    </div>`;
}

function viewPlans() {
  const section = (kind, title, ic, text) => {
    const list = state.data.plans.filter((p) => (p.data.kind === 'attack' ? 'attack' : 'defense') === kind);
    return html`<div class="section-head ${kind}">
        <h2>${icon(ic)} ${title} <span class="n">${list.length} แผน</span></h2>
        ${can('editor') ? html`<a class="btn primary" href="#/p/new-${kind}/edit">${icon('plus')} สร้าง${title}</a>` : ''}
      </div>
      ${list.length
        ? html`<div class="list">${list.map(
            (p) => html`<a class="list-item" href="#/p/${p.id}">
              ${icon(ic)}<b>${p.title}</b>
              <span class="muted small">${(p.data.slots || []).length} ไม้ · อัปเดต ${fmtDate(p.updatedAt)}</span>
            </a>`,
          )}</div>`
        : emptyState(ic, `ยังไม่มี${title}`, text)}`;
  };
  return html`${homeTop('plans')}
    ${section('attack', 'แผนบุก', 'swords', 'กด "สร้างแผนบุก" — วางว่าแต่ละไม้ใช้ทีมไหนตีบ้านไหน')}
    ${section('defense', 'แผนกัน', 'shield', 'กด "สร้างแผนกัน" — วางบ้านกันของกิลด์ แต่ละไม้ใส่ทีมสำรองได้ตามลำดับ')}`;
}

function viewPlan(id) {
  const p = findPlan(id);
  if (!p) return html`<p class="center muted">ไม่พบแผน</p>`;
  const isAttack = p.data.kind === 'attack';
  return html`<div class="toolbar">
      <a class="btn ghost" href="#/plans">${icon('back')} กลับ</a>
      <span class="spacer"></span>
      <button class="btn small" data-action="share" data-hash="#/p/${p.id}">${icon('link')} แชร์ลิงก์</button>
      ${can('editor') ? html`<a class="btn small" href="#/p/${p.id}/edit">${icon('edit')} แก้ไข</a><button class="btn small danger" data-action="del-plan" data-id="${p.id}">${icon('trash')} ลบ</button>` : ''}
    </div>
    <header class="plan-heading">
      <div class="kicker">GUILD WAR · BATTLE PLAN</div>
      <h1 class="gold-title">${p.title}</h1>
      <span class="pill ${isAttack ? 'attack' : 'defense'}">${icon(isAttack ? 'swords' : 'shield')} ${isAttack ? 'แผนบุก' : 'แผนกัน'}</span>
      <div class="muted small">อัปเดต ${fmtDate(p.updatedAt)}</div>
    </header>
    ${p.data.note ? html`<div class="panel pre note plan-note">${p.data.note}</div>` : ''}
    <div class="plan-grid">${(p.data.slots || []).map((s, si) => {
      const opts = s.options || [];
      const o = opts[0];
      if (!o) return '';
      const key = (i) => `p:${p.id}:${si}:${i}`;
      return html`<div class="plan-tile" role="button" tabindex="0" data-action="open-detail" data-key="${key(0)}">
        ${teamView(o.team || emptyTeam(), o.skills || [], { title: s.name, view: { key: key(0) } })}
        <div class="tile-foot">
          <button type="button" class="tile-link" data-action="open-detail" data-key="${key(0)}">กดดูรายละเอียด</button>
          ${opts.slice(1).map((_, j) => html`<button type="button" class="tile-link reserve" data-action="open-detail" data-key="${key(j + 1)}">สำรอง ${j + 1}</button>`)}
        </div>
      </div>`;
    })}</div>`;
}

function openPlanWiz(si, oi, fresh = false) {
  const o = state.edit.data.slots[si].options[oi];
  state.planWiz = { si, oi, step: 1, snapshot: clone(o), fresh };
  state.activeTeam = `data.slots.${si}.options.${oi}.team`;
  state.sel = null;
  state.modal = null;
}

function viewPlanWizard(e, id) {
  const w = state.planWiz;
  const s = e.data.slots[w.si];
  const o = s?.options?.[w.oi];
  if (!s || !o) {
    state.planWiz = null;
    return viewPlanEditOverview(e, id);
  }
  const prefix = `data.slots.${w.si}.options.${w.oi}`;
  state.activeTeam = `${prefix}.team`;
  syncTeam(o.team, o.skills, o.heroNotes);
  const labels = e.data.kind === 'attack' ? ['ทีมบุก', PLAN_STEPS[1]] : PLAN_STEPS;
  return html`${datalists()}<div class="wiz frame">
      <div class="wiz-head">
        <span class="wiz-badge">${s.name}</span>
        ${s.options.length > 1 ? html`<span class="muted small">ตัวเลือก ${w.oi + 1}</span>` : ''}
        ${stepNav(labels, w.step, 'plan-wiz-step')}
      </div>
      <div class="wiz-body">
        ${w.step === 1
          ? html`${teamEditor(`${prefix}.team`, o.team, o.skills, `${prefix}.skills`, null, null, s.name)}
            <label>เงื่อนไข <input value="${o.condition}" data-bind="${prefix}.condition" placeholder="เช่น เจอแทงก์ / บ้านช้า" /></label>`
          : notesEditor(o.heroNotes, `${prefix}.heroNotes`, { notePath: `${prefix}.notes` })}
      </div>
      <div class="wiz-foot">
        <button type="button" class="btn ghost" data-action="plan-wiz-cancel">ยกเลิก</button>
        <span class="spacer"></span>
        ${w.step > 1 ? html`<button type="button" class="btn" data-action="plan-wiz-step" data-step="${w.step - 1}">ย้อนกลับ</button>` : ''}
        ${w.step < 2
          ? html`<button type="button" class="btn" data-action="plan-wiz-step" data-step="${w.step + 1}">ถัดไป</button>`
          : html`<button type="button" class="btn primary" data-action="plan-wiz-done">✓ เสร็จ</button>`}
      </div>
    </div>`;
}

function viewPlanEditOverview(e, id) {
  return html`${datalists()}<div class="toolbar"><a class="btn ghost" href="${id.startsWith('new') ? '#/plans' : `#/p/${id}`}">${icon('back')} ยกเลิก</a><h2>${id.startsWith('new') ? `สร้างแผน${e.data.kind === 'attack' ? 'บุก' : 'กัน'}` : 'แก้ไขแผน'}</h2></div>
    <div class="panel">
      <div class="grid2">
        <label>ชื่อแผน <input value="${e.title}" data-bind="title" /></label>
        <label>ประเภท <select data-bind="data.kind" data-rerender>${[['defense', 'ป้องกัน'], ['attack', 'บุก']].map(([k, v]) => html`<option value="${k}" ${e.data.kind === k ? raw('selected') : ''}>${v}</option>`)}</select></label>
      </div>
      <label>โน้ตแผน <textarea rows="3" data-bind="data.note">${e.data.note || ''}</textarea></label>
    </div>
    <div class="plan-cards">${e.data.slots.map((s, si) => {
      s.options.forEach((o) => syncTeam(o.team, o.skills, o.heroNotes));
      return html`<div class="slot-card">
        <div class="slot-head"><input class="slot-name" value="${s.name}" data-bind="data.slots.${si}.name" />
          <button type="button" class="btn icon small danger slot-del" data-action="plan-slot-del" data-i="${si}" title="ลบไม้นี้">${icon('trash')}</button></div>
        <div class="plan-options">${s.options.map(
          (o, oi) => html`<div class="option">
            <div class="edit-hit" role="button" tabindex="0" data-action="plan-wiz-open" data-i="${si}" data-j="${oi}" title="แตะเพื่อแก้ไขทีม">
              <div class="muted small">${oi === 0 ? 'ทีมหลัก' : `สำรอง ${oi}`}</div>
              ${o.condition ? html`<div class="condition">เงื่อนไข: ${o.condition}</div>` : ''}
              ${teamView(o.team || emptyTeam(), o.skills || [])}
              <span class="edit-hint">✎ แก้ไข</span>
            </div>
            <div class="actions">
              <button type="button" class="btn small ghost" data-action="plan-opt-del" data-i="${si}" data-j="${oi}">ลบ</button>
            </div>
          </div>`,
        )}</div>
        <button type="button" class="btn small" data-action="plan-opt-add" data-i="${si}">+ ทีมสำรอง</button>
      </div>`;
    })}<button type="button" class="slot-add" data-action="plan-slot-add"><span class="plus">+</span>ตั้งไม้ ${e.data.slots.length + 1}</button></div>
    <div class="actions">
      <button type="button" class="btn primary" data-action="save-plan" data-id="${id}">บันทึกแผน</button>
    </div>`;
}

function viewPlanEdit(id) {
  if (!state.edit || state.edit.__key !== `p:${id}`) {
    const isNew = id.startsWith('new');
    const p = isNew ? null : findPlan(id);
    if (!isNew && !p) return html`<p class="center muted">ไม่พบแผน</p>`;
    const data = p ? clone(p.data) : { kind: id === 'new-attack' ? 'attack' : 'defense', note: '', slots: [] };
    data.slots ||= [];
    for (const s of data.slots) {
      s.options ||= [];
      for (const o of s.options) (o.team ||= emptyTeam()), (o.skills ||= []), (o.heroNotes ||= []), (o.condition ||= ''), (o.notes ||= '');
    }
    state.edit = { __key: `p:${id}`, title: p?.title || '', data };
    state.planWiz = null;
  }
  const e = state.edit;
  if (state.planWiz) return viewPlanWizard(e, id);
  return viewPlanEditOverview(e, id);
}

function viewAdmin() {
  if (!can('admin')) return html`<p class="center muted">เฉพาะแอดมิน</p>`;
  const a = state.admin;
  if (!a) {
    Promise.all([api('GET', '/members'), api('GET', '/audit')])
      .then(([m, l]) => ((state.admin = { members: m.members, audit: l.audit }), render()))
      .catch((e) => toast(errMsg(e), true));
    return html`<p class="center muted">กำลังโหลด...</p>`;
  }
  return html`<div class="toolbar"><a class="btn ghost" href="#/">${icon('back')} กลับ</a><h2>${icon('settings')} ตั้งค่ากิลด์</h2></div>
    <div class="admin-grid">
      <div class="panel frame">
        <h3>${icon('key')} เปลี่ยนรหัสกิลด์</h3>
        <p class="muted small">เมื่อเปลี่ยนรหัส ทุกคนที่เปิดเว็บอยู่จะถูกล็อคทันทีและต้องใช้รหัสใหม่</p>
        <form data-form="password">
          <input type="password" name="current" placeholder="รหัสปัจจุบัน" autocomplete="current-password" required />
          <input type="password" name="next" placeholder="รหัสใหม่ (8+ ตัว)" autocomplete="new-password" required minlength="8" />
          <input type="password" name="confirm" placeholder="ยืนยันรหัสใหม่" autocomplete="new-password" required minlength="8" />
          <button class="btn primary">เปลี่ยนรหัส</button>
        </form>
      </div>
      <div class="panel frame">
        <h3>${icon('lock')} ความปลอดภัย</h3>
        <p class="muted small">บังคับออกจากระบบทุกคน (ยกเว้นคุณ) ต้อง Login Discord ใหม่</p>
        <button class="btn danger" data-action="revoke-all">เตะทุกคนออกจากระบบ</button>
        <h3>${icon('download')} นำเข้าจาก 7k-note</h3>
        <form data-form="import">
          <input name="guildCode" placeholder="รหัสกิลด์ 7k-note เช่น SExN7AHJ" value="SExN7AHJ" />
          <textarea name="json" rows="3" placeholder="หรือวาง JSON ที่ export มา"></textarea>
          <button class="btn">นำเข้า (รวมกับข้อมูลเดิม)</button>
        </form>
      </div>
    </div>
    <div class="panel">
      <h3>${icon('users')} สมาชิก (${a.members.length})</h3>
      <form data-form="add-member" class="inline">
        <input name="discordId" placeholder="Discord User ID" required pattern="\\d{15,22}" />
        <input name="note" placeholder="ชื่อ (ไม่บังคับ)" />
        <select name="role">${Object.entries(ROLE_LABEL).map(([k, v]) => html`<option value="${k}" ${k === 'viewer' ? raw('selected') : ''}>${v}</option>`)}</select>
        <button class="btn primary">เพิ่มสมาชิก</button>
      </form>
      <div class="table-wrap"><table>
        <thead><tr><th></th><th>ชื่อ</th><th>Discord ID</th><th>สิทธิ์</th><th>สถานะ</th><th>ใช้งานล่าสุด</th></tr></thead>
        <tbody>${a.members.map(
          (m) => html`<tr class="${m.status === 'banned' ? 'banned' : ''}">
            <td>${m.avatar ? html`<img class="avatar" src="${m.avatar}" alt="" />` : ''}</td>
            <td>${m.name || '-'}</td>
            <td class="mono">${m.id}</td>
            <td><select data-member-role="${m.id}" ${m.id === state.me.id ? raw('disabled') : ''}>${Object.entries(ROLE_LABEL).map(
              ([k, v]) => html`<option value="${k}" ${m.role === k ? raw('selected') : ''}>${v}</option>`,
            )}</select></td>
            <td>${m.id === state.me.id ? 'คุณ' : html`<button class="btn small ${m.status === 'banned' ? '' : 'danger'}" data-action="toggle-ban" data-id="${m.id}" data-status="${m.status === 'banned' ? 'active' : 'banned'}">${m.status === 'banned' ? 'ปลดแบน' : 'แบน/ถอดสิทธิ์'}</button>`}</td>
            <td class="small">${fmtDate(m.lastSeen)}</td>
          </tr>`,
        )}</tbody>
      </table></div>
    </div>
    <div class="panel">
      <h3>${icon('log')} บันทึกการใช้งาน</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>เวลา</th><th>ผู้ใช้</th><th>การกระทำ</th><th>รายละเอียด</th><th>IP</th></tr></thead>
        <tbody>${a.audit.map(
          (l) => html`<tr class="${/fail|denied/.test(l.action) ? 'warn' : ''}"><td class="small">${fmtDate(l.ts)}</td><td>${l.name || l.discord_id || '-'}</td><td>${l.action}</td><td class="small">${l.detail}</td><td class="mono small">${l.ip}</td></tr>`,
        )}</tbody>
      </table></div>
    </div>`;
}

function collectSavedNotes(notes) {
  const bases = new Set((notes || []).map((n) => heroInfo(n.hero).base).filter(Boolean));
  const out = [];
  if (!bases.size) return out;
  for (const t of state.data.targets || []) {
    (t.counters || []).forEach((c, i) => {
      for (const n of c.heroNotes || []) {
        if (!noteFilled(n) || !bases.has(heroInfo(n.hero).base)) continue;
        out.push({ n, src: `${t.tags?.length ? t.tags.join(' ') + ' · ' : ''}ทีมแก้ #${i + 1}`, ts: c.updatedAt || t.updatedAt });
      }
    });
  }
  for (const p of state.data.plans || []) {
    (p.data?.slots || []).forEach((s) => {
      (s.options || []).forEach((o, oi) => {
        for (const n of o.heroNotes || []) {
          if (!noteFilled(n) || !bases.has(heroInfo(n.hero).base)) continue;
          out.push({
            n,
            src: `${p.title} · ${s.name}${s.options.length > 1 ? ` · ตัวเลือก ${oi + 1}` : ''}`,
            ts: p.updatedAt,
          });
        }
      });
    });
  }
  return out;
}

// ---------- dock: bottom strip of hero / pet cards with search + filters ----------
const searchKey = (x) => x.aliases.join(' ').toLowerCase();
const matchQ = (x) => {
  const words = state.dock.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return words.every((w) => searchKey(x).includes(w));
};
const dockHeroes = () => AS.heroes.filter((h) => (!state.dock.rarity || h.rarity === state.dock.rarity) && (!state.dock.type || h.type === state.dock.type));
const dockPets = () => AS.pets.filter((p) => !state.dock.petRarity || p.rarity === state.dock.petRarity);

function usedIn(prefix) {
  const t = prefix && teamAt(prefix);
  if (!t) return { heroes: new Set(), pets: new Set() };
  return { heroes: new Set(heroesOf(t).map(heroBase)), pets: new Set([t.pet, ...t.extras].filter(Boolean)) };
}

function dockCard(x, kind, used) {
  const on = kind === 'hero' ? used.heroes.has(x.name) : used.pets.has(x.name);
  const hidden = !matchQ(x);
  if (kind === 'pet')
    return html`<button type="button" class="dcard pet ${on ? 'used' : ''}" data-action="dock-pick" data-kind="pet" data-value="${x.name}" data-search="${searchKey(x)}" title="${x.name}" ${hidden ? raw('hidden') : ''}>
      ${portrait(x.img)}<span class="nm">${x.name}</span>
    </button>`;
  return html`<button type="button" class="dcard t-${x.type || 'none'} ${on ? 'used' : ''}" data-action="dock-pick" data-kind="hero" data-value="${defaultHeroName(x)}" data-search="${searchKey(x)}" title="${x.name}" ${hidden ? raw('hidden') : ''}>
    ${portrait(x.awk || x.img)}
    ${x.type && AS.types?.[x.type] ? html`<span class="role"><img src="${AS.types[x.type]}" alt="" /></span>` : ''}
    ${x.awk ? html`<span class="awk-dot" title="มีร่างอเวค"></span>` : ''}
    <span class="nm">${x.name}</span>
  </button>`;
}

function dockHint() {
  const s = state.sel;
  if (!s) return 'แตะการ์ดเพื่อใส่ในช่องว่างถัดไป หรือแตะช่องในทีมก่อน';
  if (s.field === 'slots') return `เลือกช่อง ${s.i + 1} อยู่ — แตะอัศวินเพื่อใส่ หรือแตะอีกช่องเพื่อสลับ`;
  return s.field === 'pet' ? 'เลือกช่องสัตว์เลี้ยงหลักอยู่' : `เลือกสัตว์เลี้ยงสำรอง ${s.i + 1} อยู่`;
}

function viewDock() {
  const d = state.dock;
  const used = usedIn(state.sel?.team || state.activeTeam);
  const filtered = d.tab === 'hero' ? d.rarity || d.type : d.petRarity;
  const list = d.tab === 'hero' ? dockHeroes() : dockPets();
  return html`<div class="dock ${d.collapsed ? 'collapsed' : ''}">
    <button type="button" class="dock-toggle" data-action="dock-collapse" title="${d.collapsed ? 'เปิดแถบ' : 'เก็บแถบ'}">${icon(d.collapsed ? 'up' : 'down')}</button>
    <div class="dock-inner">
      <div class="dock-bar">
        <button type="button" class="btn icon" data-action="modal" data-modal="grid" title="ดูทั้งหมด">${icon('grid')}</button>
        <button type="button" class="btn icon ${d.search || d.q ? 'on' : ''}" data-action="dock-search" title="ค้นหาชื่อ">${icon('search')}</button>
        <button type="button" class="btn icon ${filtered ? 'on' : ''}" data-action="modal" data-modal="filter" title="กรองประเภท">${icon('filter')}</button>
        <div class="seg mini">
          <a href="#" class="${d.tab === 'hero' ? 'active' : ''}" data-action="dock-tab" data-tab="hero">อัศวิน</a>
          <a href="#" class="${d.tab === 'pet' ? 'active' : ''}" data-action="dock-tab" data-tab="pet">สัตว์เลี้ยง</a>
        </div>
        ${d.search || d.q ? html`<input class="dock-q" type="search" placeholder="ค้นหาชื่อ (ไทย/อังกฤษ)" value="${d.q}" data-dock-q />` : ''}
        <span class="dock-hint">${dockHint()}</span>
      </div>
      <div class="dock-strip">${list.map((x) => dockCard(x, d.tab, used))}${list.length ? '' : html`<span class="muted small">ไม่พบตามตัวกรอง</span>`}</div>
    </div>
  </div>`;
}

function viewModal() {
  const m = state.modal;
  const close = html`<button type="button" class="btn icon ghost" data-action="modal-close" title="ปิด">✕</button>`;
  const wrap = (title, body, cls = '') => html`<div class="modal-bg" data-action="modal-close"><div class="modal frame ${cls}"><div class="modal-head"><h3>${title}</h3>${close}</div>${body}</div></div>`;
  const d = state.dock;

  if (m.kind === 'filter') {
    const opt = (key, val, label, dot = '') =>
      html`<button type="button" class="fopt ${d[key] === val ? 'active' : ''}" data-action="set-filter" data-key="${key}" data-val="${val}">${dot ? html`<i class="dot ${dot}"></i>` : ''}${label}</button>`;
    return d.tab === 'hero'
      ? wrap(
          'กรองอัศวิน',
          html`<div class="flabel">ระดับ</div>
          <div class="fgrid">${opt('rarity', '', 'ทั้งหมด')}${RARITY_GROUPS.map(([r, , short]) => opt('rarity', r, short, `r-${r.replace(/\+/g, 'p')}`))}</div>
          <div class="flabel">ธาตุ</div>
          <div class="fgrid">${opt('type', '', 'ทั้งหมด')}${TYPES.map(([t, label]) => opt('type', t, label, `t-${t}`))}</div>
          <button type="button" class="btn primary block" data-action="modal-close">ตกลง</button>`,
          'small',
        )
      : wrap(
          'กรองสัตว์เลี้ยง',
          html`<div class="flabel">ระดับ</div>
          <div class="fgrid">${opt('petRarity', '', 'ทั้งหมด')}${opt('petRarity', 'L', 'ตำนาน (L)', 'r-L')}${opt('petRarity', 'R', 'หายาก (R)', 'r-R')}</div>
          <button type="button" class="btn primary block" data-action="modal-close">ตกลง</button>`,
          'small',
        );
  }

  if (m.kind === 'grid') {
    const used = usedIn(state.sel?.team || state.activeTeam);
    const groups =
      d.tab === 'hero'
        ? RARITY_GROUPS.map(([r, label]) => [label, dockHeroes().filter((h) => h.rarity === r)])
        : [['ตำนาน (L)', dockPets().filter((p) => p.rarity === 'L')], ['หายาก (R)', dockPets().filter((p) => p.rarity === 'R')]];
    return wrap(
      `${d.tab === 'hero' ? 'อัศวินทั้งหมด' : 'สัตว์เลี้ยงทั้งหมด'}${state.sel ? ` · ${dockHint()}` : ''}`,
      html`<div class="dock-bar in-modal">
        <button type="button" class="btn icon ${d.rarity || d.type || d.petRarity ? 'on' : ''}" data-action="modal" data-modal="filter" title="กรองประเภท">${icon('filter')}</button>
        <input class="dock-q" type="search" placeholder="ค้นหาชื่อ (ไทย/อังกฤษ)" value="${d.q}" data-dock-q />
      </div>
      <div class="grid-groups">${groups
        .filter(([, list]) => list.length)
        .map(([label, list]) => html`<div class="ggroup"><h4>${label} <span class="muted small">${list.length} ตัว</span></h4><div class="ggrid">${list.map((x) => dockCard(x, d.tab, used))}</div></div>`)}</div>`,
      'wide',
    );
  }

  if (m.kind === 'formation') {
    const team = teamAt(m.team);
    return wrap(
      'รูปแบบการจัดทีม (Formation)',
      html`<div class="fmgrid">${[2, 3, 1, 4].map(
        (f) => html`<button type="button" class="fmopt ${team.front === f ? 'active' : ''}" data-action="set-formation" data-team="${m.team}" data-f="${f}">
          ${formationDiagram(f)}<b>${team.front === f ? '✓ ' : ''}รูปแบบ${FORMATIONS[f]}</b><span class="muted small">${FORMATION_EN[f]} · หน้า ${f} หลัง ${5 - f}</span>
        </button>`,
      )}</div>
      <p class="muted small"><span class="blue">โล่น้ำเงิน</span> = แถวหน้า · <span class="red">หมากแดง</span> = แถวหลัง</p>`,
      'medium',
    );
  }

  if (m.kind === 'skills' || m.kind === 'skillview') {
    const edit = m.kind === 'skills';
    const ctx = edit ? { team: teamAt(m.team), skills: getPath(state.edit, m.skills) } : teamByKey(m.key);
    if (!ctx) return '';
    return wrap('ลำดับการใช้สกิล (Skill Queue)', skillQueue(ctx.team, ctx.skills, edit ? m.skills : null), 'medium');
  }

  if (m.kind === 'detail') {
    const ctx = teamByKey(m.key);
    if (!ctx) return '';
    return wrap(
      `${ctx.title} · รายละเอียดทั้งทีม`,
      html`<div class="detail-grid">
        <div class="detail-board">${teamView(ctx.team, ctx.skills, { title: heroesOf(ctx.team).map(heroBase).join(' · '), tone: ctx.tone, view: { key: m.key, noHero: true } })}</div>
        <div class="detail-side">
          ${ctx.condition ? html`<div class="condition">เงื่อนไข: ${ctx.condition}</div>` : ''}
          ${ctx.note ? html`<div class="pre note">${ctx.note}</div>` : ''}
          ${ctx.notes ? heroNotesView(ctx.notes) || html`<p class="muted center">ยังไม่ได้จดอุปกรณ์/ค่าความสามารถ</p>` : html`<p class="muted center">บ้านศัตรูไม่มีรายละเอียดอุปกรณ์</p>`}
        </div>
      </div>
      <button type="button" class="btn primary block" data-action="modal-close">ปิดรายละเอียด</button>`,
      'wide',
    );
  }

  if (m.kind === 'speed') {
    const ctx = teamByKey(m.key);
    if (!ctx) return '';
    const spd = (h) => (ctx.notes || []).find((n) => n.hero === h)?.stats?.spd;
    const list = heroesOf(ctx.team).sort((a, b) => (spd(b) ?? -1) - (spd(a) ?? -1));
    return wrap(
      html`${icon('speed')} ความเร็วทีม <span class="gold">${ctx.team.speed || 0}</span>`,
      html`<div class="muted small">ลำดับอัศวินตามความเร็วโจมตี</div>
      <div class="speed-order">${list.map(
        (h, i) => html`${i ? html`<span class="chev">›</span>` : ''}<div class="speed-item">${heroCard(h, { cls: 'sm' })}<b>${spd(h) ?? '—'}</b></div>`,
      )}</div>`,
      'small',
    );
  }

  if (m.kind === 'pick-gear') {
    const map = m.gear === 'rings' ? AS.rings : AS.sets;
    const names = Object.keys(map || {}).filter((n) => n !== 'แหวนแห่งการคีนชีพ');
    const cur = getPath(state.edit, m.path) || [];
    return wrap(
      m.gear === 'rings' ? 'เลือกเครื่องประดับ' : 'เลือกเซตอุปกรณ์',
      html`<div class="gear-grid">${names.map(
        (n) => html`<button type="button" class="gear-opt ${cur[m.k] === n ? 'active' : ''}" data-action="set-gear" data-name="${n}"><img src="${map[n]}" alt="" /><span>${m.gear === 'sets' ? `ชุด${n}` : n}</span></button>`,
      )}</div>
      <div class="actions"><button type="button" class="btn danger" data-action="set-gear" data-name="">ล้างช่องนี้</button></div>`,
      'medium',
    );
  }

  if (m.kind === 'stats') {
    const n = getPath(state.edit, m.path);
    if (!n) return '';
    const sp = `${m.path}.stats`;
    return wrap(
      html`<span class="stats-title">${heroCard(n.hero, { cls: 'sm' })} ค่าความสามารถ · ${heroInfo(n.hero).base}</span>`,
      html`<div class="stat-edit">${STATS.map(
        ([k, l]) => html`<label class="stat-pill">${AS.stats?.[k] ? html`<img src="${AS.stats[k]}" alt="" />` : ''}<span>${STAT_FULL[k] || l}</span><input type="number" step="any" value="${n.stats?.[k] ?? ''}" placeholder="—" data-bind="${sp}.${k}" data-type="stat" />${PCT_STATS.has(k) ? html`<i>%</i>` : ''}</label>`,
      )}</div>
      <div class="actions"><button type="button" class="btn danger" data-action="stats-clear" data-path="${m.path}">ล้างค่า</button><button type="button" class="btn" data-action="open-ocr" data-path="${m.path.slice(0, m.path.lastIndexOf('.'))}" data-i="${m.path.slice(m.path.lastIndexOf('.') + 1)}" data-from-stats="${m.path}">📷 อ่านค่าจากรูป</button><button type="button" class="btn primary" data-action="modal-close">เสร็จ</button></div>`,
      'medium',
    );
  }

  if (m.kind === 'ocr') {
    const notes = getPath(state.edit, m.path) || [];
    const n = notes[m.i];
    if (!n || !state.edit) return '';
    const sc = state.edit.__ocr?.stats || {};
    const busy = m.status === 'loading';
    const base = heroInfo(n.hero).base;
    const status = busy
      ? html`<div class="ocr-status"><progress max="1" value="${m.progress || 0}" data-ocr-progress></progress><span class="muted small" data-ocr-label>${m.label}</span></div>`
      : m.status === 'error'
        ? html`<div class="ocr-status err">${m.error}</div>`
        : m.status === 'done'
          ? html`<div class="ocr-status ${m.missing.length ? 'warn' : 'ok'}">อ่านได้ ${STATS.length - m.missing.length}/${STATS.length} ช่อง${m.missing.length ? ' — ช่องที่ไฮไลต์ไว้อ่านไม่ได้ กรอกเองได้เลย' : ''}</div>`
          : '';
    return wrap(
      '📷 อ่านค่าความสามารถจากรูป',
      html`<div class="ocr">
        <div class="ocr-left">
          <label class="ocr-drop ${m.preview ? 'has' : ''}" data-drop>
            <input type="file" accept="image/*" class="ocr-file" data-ocr-file />
            ${m.preview ? html`<img src="${m.preview}" alt="รูปที่เลือก" />` : html`<span class="ocr-ico">📷</span>`}
            <b>${m.preview ? 'เปลี่ยนรูป' : 'ลากรูปมาวาง หรือกดเลือกรูป'}</b>
            <span class="muted small">หรือกด Ctrl+V เพื่อวางรูปจากคลิปบอร์ด</span>
          </label>
          <details class="ocr-help" ${m.preview ? '' : raw('open')}>
            <summary>วิธีใช้ / ต้องแคปหน้าไหน</summary>
            <ol class="small">
              <li>ในเกม กดที่อัศวินเพื่อเปิดหน้าข้อมูลอัศวิน ให้เห็นแผงค่าความสามารถครบ 15 ช่อง (2 คอลัมน์)</li>
              <li>แคปหน้าจอ แล้วลากรูปมาวาง / เลือกไฟล์ / กด Ctrl+V</li>
              <li>ตรวจตัวเลขด้านขวา แก้ช่องที่ผิดได้ แล้วกด "ใส่ข้อมูล"</li>
            </ol>
            <p class="muted small">รูปถูกอ่านบนเครื่องของคุณ ไม่ถูกอัปโหลดไปไหน · ใช้ได้กับเกมภาษาไทย · ครั้งแรกจะโหลดข้อมูลภาษาประมาณ 3 MB</p>
          </details>
        </div>
        <div class="ocr-right">
          <div class="lbl">ของอัศวินตัวไหน</div>
          <div class="chips">${notes.map((x, i) => html`<button type="button" class="chip-btn ${i === m.i ? 'on' : ''}" data-action="ocr-hero" data-i="${i}">${heroInfo(x.hero).base}</button>`)}</div>
          ${status}
          <div class="stat-edit">${STATS.map(
            ([k, l]) => html`<label class="stat-pill ${m.status === 'done' && m.missing.includes(k) ? 'miss' : ''}">${AS.stats?.[k] ? html`<img src="${AS.stats[k]}" alt="" />` : ''}<span>${STAT_FULL[k] || l}</span><input type="number" step="any" value="${sc[k] ?? ''}" placeholder="—" data-bind="__ocr.stats.${k}" data-type="stat" />${PCT_STATS.has(k) ? html`<i>%</i>` : ''}</label>`,
          )}</div>
          ${m.raw ? html`<details class="ocr-raw"><summary class="small muted">ข้อความที่อ่านได้</summary><pre>${m.raw}</pre></details>` : ''}
          <p class="muted small">ตรวจตัวเลขก่อนกดใส่ · ยังไม่บันทึกจนกด "บันทึก" ของหน้านั้น</p>
          <div class="actions"><button type="button" class="btn" data-action="modal-close">ยกเลิก</button><button type="button" class="btn primary" data-action="ocr-apply" ${busy ? raw('disabled') : ''}>ใส่ข้อมูลให้ ${base}</button></div>
        </div>
      </div>`,
      'wide',
    );
  }

  if (m.kind === 'pick-notes') {
    const list = m.list || [];
    return wrap(
      'เลือกจากที่จดไว้',
      list.length
        ? html`<div class="pick-notes">${list.map(
            (item, i) => html`<div class="pick-note" role="button" tabindex="0" data-action="apply-saved-note" data-i="${i}">
              <ul class="hero-detail">${heroDetailRow(item.n)}</ul>
              <div class="muted small">${item.src} · อัปเดต ${item.ts ? lastAgoLabel(item.ts) : '—'}</div>
            </div>`,
          )}</div>`
        : html`<p class="muted center">ยังไม่มีรายการของอัศวินในทีมนี้</p>`,
      'wide',
    );
  }

  if (m.kind === 'copy-target') {
    return wrap(
      'เลือกจากบ้านศัตรูที่จดไว้',
      html`<div class="cards">${state.data.targets.map(
        (t) => html`<button type="button" class="card copy-card" data-action="copy-target" data-id="${t.id}">${teamView(t.team)}<div class="card-foot">${t.tags.map((x) => html`<span class="tag">${x}</span>`)}</div></button>`,
      )}</div>`,
      'wide',
    );
  }
  return '';
}

// resolve a view key to { team, skills, notes, title }
function teamByKey(key) {
  const [kind, a, b, c] = key.split(':');
  if (kind === 't') {
    const t = findTarget(a);
    return t && { team: t.team, skills: t.team.skills || [], notes: null, title: 'บ้านศัตรู', tone: 'enemy' };
  }
  if (kind === 'c') {
    for (const t of state.data.targets) {
      const i = t.counters.findIndex((x) => x.id === a);
      if (i >= 0) return { team: t.counters[i].team, skills: t.counters[i].skills, notes: t.counters[i].heroNotes, title: `ทีมแก้ #${i + 1}` };
    }
  }
  if (kind === 'p') {
    const o = findPlan(a)?.data?.slots?.[b]?.options?.[c];
    return o && { team: o.team || emptyTeam(), skills: o.skills || [], notes: o.heroNotes || [], condition: o.condition, note: o.notes, title: `${findPlan(a).data.slots[b].name} · ${Number(c) ? `สำรอง ${c}` : 'ทีมหลัก'}` };
  }
  return null;
}

// skill queue: each hero with its skill icons; edit mode toggles skills in/out of the 3-step queue
function skillQueue(team, skills, path) {
  const heroes = team.slots.map((n, i) => [n, i]).filter(([n]) => n);
  if (!heroes.length) return html`<p class="muted center">ใส่อัศวินในทีมก่อน</p>${path ? html`<button type="button" class="btn primary block" data-action="modal-close">เสร็จ</button>` : ''}`;
  const orderOf = (slot, n) => skills.findIndex((s) => s.slot === slot && s.skill === n);
  return html`<div class="sq-head"><span class="muted">ตั้งแล้ว ${skills.length}/${MAX_SKILLS}</span>${path ? html`<button type="button" class="btn small" data-action="skill-clear" data-path="${path}">${icon('reset')} รีเซต</button>` : ''}</div>
    <div class="sq-heroes">${heroes.map(
      ([n, slot]) => html`<div class="sq-hero">
        <div class="sq-face">${portrait(heroInfo(n).img)}<span class="sq-ring"></span></div>
        <div class="sq-skills">${skillsOf(n).map((s) => {
          const o = orderOf(slot, s.n);
          return html`<button type="button" class="sq-btn ${s.n === 3 ? 'awk' : ''} ${o >= 0 ? 'on' : ''}" title="${heroBase(n)} · สกิล${SKILL_LABEL[s.n]} · ${s.name}" ${path ? raw(`data-action="skill-toggle" data-path="${esc(path)}" data-slot="${slot}" data-skill="${s.n}"`) : raw('disabled')}>
            ${s.img ? html`<img src="${s.img}" alt="" />` : html`<span>${SKILL_LABEL[s.n]}</span>`}
            ${o >= 0 ? html`<em class="ord ${ORDER_CLASS[o]}">ลำดับ ${o + 1}</em>` : ''}
          </button>`;
        })}</div>
        <div class="sq-name">${heroBase(n)}</div>
      </div>`,
    )}</div>
    <p class="sq-summary">${skills.length ? skills.map((s, i) => `${i + 1}. ${heroBase(team.slots[s.slot] || '')} ${SKILL_LABEL[s.skill]}`).join('  →  ') : 'ยังไม่ได้ตั้งลำดับ'}</p>
    <button type="button" class="btn primary block" data-action="modal-close">${path ? 'เสร็จ' : 'ปิด'}</button>`;
}

// ---------- router ----------
function route() {
  const h = location.hash.replace(/^#/, '') || '/';
  let m;
  if (h === '/') return viewTargets();
  if (h === '/new') return viewTargetEdit('new');
  if ((m = h.match(/^\/t\/([\w-]+)$/))) return viewTarget(m[1]);
  if ((m = h.match(/^\/t\/([\w-]+)\/edit$/))) return viewTargetEdit(m[1]);
  if ((m = h.match(/^\/t\/([\w-]+)\/c\/([\w-]+)\/edit$/))) return viewCounterEdit(m[1], m[2]);
  if ((m = h.match(/^\/t\/([\w-]+)\/c\/new$/))) return viewCounterEdit(m[1], 'new');
  if (h === '/plans') return viewPlans();
  if ((m = h.match(/^\/p\/([\w-]+)\/edit$/))) return viewPlanEdit(m[1]);
  if ((m = h.match(/^\/p\/([\w-]+)$/))) return viewPlan(m[1]);
  if (h === '/admin') return viewAdmin();
  return html`<p class="center muted">ไม่พบหน้านี้</p>`;
}

function renderNav() {
  const h = location.hash || '#/';
  const { dow, time } = bkkNow();
  const kind = SCHEDULE[dow];
  const link = (href, ic, label, active) => html`<a href="${href}" class="${active ? 'active' : ''}">${icon(ic)} ${label}</a>`;
  $nav.innerHTML = fmt(html`
    <div class="clock">
      <div><div class="clock-time" id="clock">${time}</div><div class="clock-sub">เวลาไทย</div></div>
      ${kind ? html`<div class="today">${DAYS[dow]} <span class="pill ${kind}">${DAY_KIND[kind].full}</span></div>` : ''}
    </div>
    ${state.me && state.token
      ? html`<div class="navlinks">
          ${link('#/', 'swords', 'บ้านศัตรู', h === '#/' || h.startsWith('#/t') || h === '#/new')}
          ${link('#/plans', 'clipboard', 'แผน', h.startsWith('#/p'))}
          ${can('admin') ? link('#/admin', 'settings', 'ตั้งค่า', h === '#/admin') : ''}
        </div>
        <button class="btn icon ghost" data-action="lock" title="ล็อคหน้าจอ">${icon('lock')}</button>`
      : html`<span class="spacer"></span>`}
    ${state.me
      ? html`<span class="user">${state.me.avatar ? html`<img src="${state.me.avatar}" alt="" />` : ''}<span>${state.me.name}</span><span class="role">${ROLE_LABEL[state.me.role]}</span></span>
        <button class="btn icon ghost" data-action="logout" title="ออกจากระบบ">${icon('logout')}</button>`
      : ''}`);
}

setInterval(() => {
  const el = document.getElementById('clock');
  if (el) el.textContent = bkkNow().time;
}, 1000);

function render() {
  renderNav();
  if (!state.me) return ($app.innerHTML = fmt(viewLogin()));
  if (!state.token) return ($app.innerHTML = fmt(viewUnlock()));
  if (!state.data) {
    $app.innerHTML = '<div class="center muted">กำลังโหลดข้อมูล...</div>';
    loadData().then(render, (e) => e.status !== 423 && toast(errMsg(e), true));
    return;
  }
  // keep scroll positions of the dock strip / grid modal and focus of the search box across re-renders
  const keep = ['.dock-strip', '.grid-groups'].map((s) => [s, $app.querySelector(s)?.scrollLeft, $app.querySelector(s)?.scrollTop]);
  const focusQ = document.activeElement?.hasAttribute?.('data-dock-q') ? document.activeElement.selectionStart : null;
  const page = fmt(route());
  const h = location.hash;
  const dock = !state.edit
    ? false
    : /\/c\/[\w-]+\/edit|\/c\/new/.test(h)
      ? state.step === 2
      : /\/p\/[\w-]+\/edit/.test(h)
        ? state.planWiz?.step === 1
        : true;
  $app.innerHTML = page + (dock ? fmt(viewDock()) : '') + (state.modal ? fmt(viewModal()) : '');
  document.body.classList.toggle('has-dock', !!dock);
  for (const [s, l, t] of keep) {
    const el = $app.querySelector(s);
    if (el) (el.scrollLeft = l || 0), (el.scrollTop = t || 0);
  }
  const q = [...$app.querySelectorAll('[data-dock-q]')].pop();
  if (q && (focusQ !== null || state.dock.focus)) q.focus(), q.setSelectionRange(focusQ ?? q.value.length, focusQ ?? q.value.length), (state.dock.focus = false);
}

addEventListener('hashchange', () => {
  state.edit = null;
  state.sel = null;
  state.activeTeam = null;
  state.modal = null;
  state.step = 2;
  state.planWiz = null;
  state.ci = 0;
  if (location.hash !== '#/admin') state.admin = null;
  render();
  scrollTo(0, 0);
});

// ---------- events ----------
async function refresh(hash) {
  await loadData();
  state.edit = null;
  if (hash && location.hash !== hash) location.hash = hash;
  else render();
}

// opened from inside the team-detail popup: closing returns to it
const detailBack = () => (state.modal?.kind === 'detail' ? { back: 'detail', backKey: state.modal.key } : {});

const actions = {
  login() {
    if (location.hash && location.hash !== '#/') sessionStorage.setItem(NEXT_KEY, location.hash);
    location.href = '/auth/login';
  },
  async logout() {
    await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' });
    state.me = null;
    lock();
  },
  lock: () => lock(),
  async 'admin-unlock'() {
    await adminUnlock();
    const next = sessionStorage.getItem(NEXT_KEY);
    sessionStorage.removeItem(NEXT_KEY);
    if (next && next !== location.hash) location.hash = next;
    else render();
  },
  share: (el) => copyLink(el.dataset.hash),
  // ----- team board -----
  slot(el) {
    const { team: prefix, field } = el.dataset;
    const i = Number(el.dataset.i);
    state.activeTeam = prefix;
    const s = state.sel && !state.sel.auto ? state.sel : null;
    if (s && s.team === prefix && s.field === field && (field === 'pet' || s.i === i)) {
      state.sel = null;
      return render();
    }
    if (field === 'slots' && s && s.team === prefix && s.field === 'slots') {
      const t = teamAt(prefix);
      if (t.slots[s.i] || t.slots[i]) {
        swapSlots(prefix, s.i, i);
        state.sel = null;
        return render();
      }
    }
    state.sel = { team: prefix, field, i };
    state.dock.tab = field === 'slots' ? 'hero' : 'pet';
    state.dock.collapsed = false;
    render();
  },
  'slot-clear'(el) {
    const team = teamAt(el.dataset.team);
    team.slots[Number(el.dataset.i)] = null;
    state.sel = null;
    render();
  },
  'toggle-awk'(el) {
    const team = teamAt(el.dataset.team);
    const i = Number(el.dataset.i);
    const h = heroInfo(team.slots[i]);
    team.slots[i] = h.awake ? h.base : `${h.base} awake`;
    render();
  },
  'team-reset'(el) {
    if (!confirm('ล้างทีมนี้ทั้งหมด?')) return;
    const team = teamAt(el.dataset.team);
    Object.assign(team, { ...emptyTeam(), front: team.front });
    getPath(state.edit, el.dataset.skills)?.splice(0);
    state.sel = null;
    render();
  },
  'open-formation'(el) {
    state.activeTeam = el.dataset.team;
    state.modal = { kind: 'formation', team: el.dataset.team };
    render();
  },
  'open-skills'(el) {
    state.activeTeam = el.dataset.team;
    state.modal = { kind: 'skills', team: el.dataset.team, skills: el.dataset.skills };
    render();
  },
  'set-formation'(el) {
    teamAt(el.dataset.team).front = Number(el.dataset.f);
    state.modal = null;
    render();
  },
  'skill-push'(el) {
    const skills = getPath(state.edit, el.dataset.path);
    if (skills.length < MAX_SKILLS) skills.push({ slot: Number(el.dataset.slot), skill: Number(el.dataset.skill) });
    render();
  },
  'skill-del'(el) {
    getPath(state.edit, el.dataset.path).splice(Number(el.dataset.i), 1);
    render();
  },
  'skill-clear'(el) {
    getPath(state.edit, el.dataset.path).splice(0);
    render();
  },
  'skill-toggle'(el) {
    const skills = getPath(state.edit, el.dataset.path);
    const slot = Number(el.dataset.slot);
    const skill = Number(el.dataset.skill);
    const i = skills.findIndex((s) => s.slot === slot && s.skill === skill);
    if (i >= 0) skills.splice(i, 1);
    else if (skills.length < MAX_SKILLS) skills.push({ slot, skill });
    else toast(`ตั้งได้สูงสุด ${MAX_SKILLS} สกิล — กดสกิลที่ตั้งไว้เพื่อเอาออกก่อน`, true);
    render();
  },
  'pick-gear'(el) {
    state.modal = { kind: 'pick-gear', path: el.dataset.path, k: Number(el.dataset.k), gear: el.dataset.kind };
    render();
  },
  'open-stats'(el) {
    const n = getPath(state.edit, el.dataset.path);
    if (n) n.stats ||= {};
    state.modal = { kind: 'stats', path: el.dataset.path };
    render();
  },
  'stats-clear'(el) {
    const n = getPath(state.edit, el.dataset.path);
    if (n) n.stats = {};
    render();
  },
  'hn-clear'(el) {
    const n = getPath(state.edit, el.dataset.path);
    if (!n) return;
    n.text = '';
    n.sets = [];
    n.rings = [];
    n.stats = {};
    render();
  },
  'hn-use-last'(el) {
    const n = getPath(state.edit, el.dataset.path);
    const last = n && readLastStats(heroInfo(n.hero).base);
    if (!last) return;
    n.stats = { ...(last.stats || {}) };
    n.sets = [...(last.sets || [])];
    n.rings = [...(last.rings || [])];
    render();
  },
  'pick-saved-notes'(el) {
    const notes = getPath(state.edit, el.dataset.path) || [];
    state.modal = { kind: 'pick-notes', path: el.dataset.path, list: collectSavedNotes(notes) };
    render();
  },
  'apply-saved-note'(el) {
    const item = state.modal?.list?.[Number(el.dataset.i)];
    const notes = getPath(state.edit, state.modal?.path);
    if (!item || !notes) return;
    const base = heroInfo(item.n.hero).base;
    const dest = notes.find((x) => heroInfo(x.hero).base === base);
    if (dest) {
      dest.stats = clone(item.n.stats || {});
      dest.sets = [...(item.n.sets || [])];
      dest.rings = [...(item.n.rings || [])];
      dest.text = item.n.text || '';
    }
    state.modal = null;
    render();
  },
  'set-gear'(el) {
    const m = state.modal;
    const list = getPath(state.edit, m.path);
    if (!Array.isArray(list)) return;
    const next = [...list];
    next[m.k] = el.dataset.name || null;
    // keep the list compact (no gaps) and unique
    const out = [...new Set(next.filter(Boolean))];
    list.splice(0, list.length, ...out);
    state.modal = null;
    render();
  },
  'copy-target'(el) {
    const t = findTarget(el.dataset.id);
    if (t && state.edit) {
      state.edit.team = clone(t.team);
      state.edit.skills = clone(t.team.skills || []);
      delete state.edit.team.skills;
      state.sel = null;
    }
    state.modal = null;
    render();
  },
  'counter-tab'(el) {
    state.ci = el.dataset.i === 'all' ? 'all' : Number(el.dataset.i);
    render();
  },
  'open-detail': (el) => ((state.modal = { kind: 'detail', key: el.dataset.key }), render()),
  'open-skillview': (el) => ((state.modal = { kind: 'skillview', key: el.dataset.key, ...detailBack() }), render()),
  'open-speed': (el) => ((state.modal = { kind: 'speed', key: el.dataset.key, ...detailBack() }), render()),
  // ----- dock -----
  'dock-pick'(el) {
    const prefix = state.sel?.team || state.activeTeam;
    if (!prefix || !teamAt(prefix)) return toast('แตะช่องในทีมก่อน', true);
    state.activeTeam = prefix;
    if (el.dataset.kind === 'hero') placeHero(prefix, el.dataset.value);
    else placePet(prefix, el.dataset.value);
    if (state.modal?.kind === 'grid') state.modal = null;
    render();
  },
  'dock-tab'(el) {
    state.dock.tab = el.dataset.tab;
    render();
  },
  'dock-search'() {
    state.dock.search = !state.dock.search || !!state.dock.q;
    state.dock.focus = state.dock.search;
    render();
  },
  'dock-collapse'() {
    state.dock.collapsed = !state.dock.collapsed;
    render();
  },
  modal(el) {
    state.modal = { kind: el.dataset.modal, back: state.modal?.kind === 'grid' ? 'grid' : null };
    render();
  },
  'modal-close'() {
    const m = state.modal;
    if (m?.kind === 'ocr') {
      m.rid = -1; // ignore a read that is still running
      delete state.edit?.__ocr;
    }
    state.modal = m?.backTo || (m?.back ? { kind: m.back, key: m.backKey } : null);
    render();
  },
  'open-ocr'(el) {
    if (!state.edit || !getPath(state.edit, el.dataset.path)?.length) return;
    state.edit.__ocr = { stats: {} }; // scratch space, never part of a save payload (save-* send explicit fields)
    state.modal = {
      kind: 'ocr',
      path: el.dataset.path,
      i: Number(el.dataset.i) || 0,
      status: 'idle',
      missing: [],
      backTo: el.dataset.fromStats ? { kind: 'stats', path: el.dataset.fromStats } : null,
    };
    render();
  },
  'ocr-hero'(el) {
    if (state.modal?.kind !== 'ocr') return;
    state.modal.i = Number(el.dataset.i) || 0;
    render();
  },
  'ocr-apply'() {
    const m = state.modal;
    if (m?.kind !== 'ocr') return;
    const n = getPath(state.edit, m.path)?.[m.i];
    if (!n) return;
    const sc = state.edit.__ocr?.stats || {};
    n.stats ||= {};
    for (const [k] of STATS) if (typeof sc[k] === 'number' && Number.isFinite(sc[k])) n.stats[k] = sc[k];
    m.rid = -1;
    delete state.edit.__ocr;
    state.modal = m.backTo || null;
    render();
  },
  'set-filter'(el) {
    state.dock[el.dataset.key] = el.dataset.val;
    render();
  },
  'tag-toggle'(el) {
    toggleTag(el.dataset.tag);
    render();
  },
  'tag-filter'(el) {
    state.tag = el.dataset.tag;
    render();
  },
  step(el) {
    state.step = Number(el.dataset.step);
    state.sel = null;
    render();
    scrollTo(0, 0);
  },
  async 'save-target'(el) {
    const id = el.dataset.id;
    const e = state.edit;
    if (!heroesOf(e.team).length) return toast('ใส่ฮีโร่อย่างน้อย 1 ตัว', true);
    if (!typeTagOf(e.tags)) return toast('เลือกประเภทบ้าน 1 อย่าง: กายภาพ / เวท / แทงก์', true);
    const body = { team: { ...e.team, skills: e.skills }, tags: sortedTags(e.tags), note: e.note };
    const r = id === 'new' ? await api('POST', '/targets', body) : await api('PUT', `/targets/${id}`, body);
    toast('บันทึกแล้ว');
    await refresh(`#/t/${id === 'new' ? r.id : id}`);
  },
  async 'save-counter'(el) {
    const { tid, id } = el.dataset;
    const e = state.edit;
    if (!heroesOf(e.team).length) return toast('ใส่ฮีโร่อย่างน้อย 1 ตัว', true);
    const body = { team: e.team, skills: e.skills, heroNotes: e.heroNotes, note: e.note };
    if (id === 'new') await api('POST', `/targets/${tid}/counters`, body);
    else await api('PUT', `/counters/${id}`, body);
    rememberHeroNotes(e.heroNotes);
    toast('บันทึกแล้ว');
    await refresh(`#/t/${tid}`);
  },
  async 'del-target'(el) {
    if (!confirm('ลบทีมศัตรูนี้และทีมแก้ทั้งหมด?')) return;
    await api('DELETE', `/targets/${el.dataset.id}`);
    toast('ลบแล้ว');
    await refresh('#/');
  },
  async 'del-counter'(el) {
    if (!confirm('ลบทีมแก้นี้?')) return;
    await api('DELETE', `/counters/${el.dataset.id}`);
    await refresh();
  },
  async 'del-plan'(el) {
    if (!confirm('ลบแผนนี้?')) return;
    await api('DELETE', `/plans/${el.dataset.id}`);
    await refresh('#/plans');
  },
  'plan-slot-add'() {
    const slots = state.edit.data.slots;
    slots.push({ name: `ไม้ ${slots.length + 1}`, kind: state.edit.data.kind, options: [emptyOption()] });
    openPlanWiz(slots.length - 1, 0, true);
    render();
    scrollTo(0, 0);
  },
  'plan-slot-del'(el) {
    if (confirm('ลบไม้นี้?')) state.edit.data.slots.splice(Number(el.dataset.i), 1), render();
  },
  'plan-opt-add'(el) {
    const si = Number(el.dataset.i);
    const opts = state.edit.data.slots[si].options;
    opts.push(emptyOption());
    openPlanWiz(si, opts.length - 1, true);
    render();
    scrollTo(0, 0);
  },
  'plan-opt-del'(el) {
    state.edit.data.slots[el.dataset.i].options.splice(Number(el.dataset.j), 1);
    render();
  },
  'plan-wiz-open'(el) {
    openPlanWiz(Number(el.dataset.i), Number(el.dataset.j), false);
    render();
    scrollTo(0, 0);
  },
  'plan-wiz-step'(el) {
    if (!state.planWiz) return;
    state.planWiz.step = Number(el.dataset.step);
    state.sel = null;
    render();
    scrollTo(0, 0);
  },
  'plan-wiz-cancel'() {
    const w = state.planWiz;
    if (!w || !state.edit) return;
    const slots = state.edit.data.slots;
    const slot = slots[w.si];
    if (slot) {
      slot.options[w.oi] = clone(w.snapshot);
      const o = slot.options[w.oi];
      const empty = !heroesOf(o.team || emptyTeam()).length;
      if (w.fresh && empty) {
        slot.options.splice(w.oi, 1);
        if (!slot.options.length) slots.splice(w.si, 1);
      }
    }
    state.planWiz = null;
    state.sel = null;
    state.activeTeam = null;
    render();
    scrollTo(0, 0);
  },
  'plan-wiz-done'() {
    state.planWiz = null;
    state.sel = null;
    state.activeTeam = null;
    render();
    scrollTo(0, 0);
  },
  async 'save-plan'(el) {
    const id = el.dataset.id;
    const body = { title: state.edit.title, data: state.edit.data };
    const isNew = id.startsWith('new');
    const r = isNew ? await api('POST', '/plans', body) : await api('PUT', `/plans/${id}`, body);
    for (const s of state.edit.data.slots || []) for (const o of s.options || []) rememberHeroNotes(o.heroNotes);
    toast('บันทึกแล้ว');
    await refresh(`#/p/${isNew ? r.id : id}`);
  },

  async 'revoke-all'() {
    if (!confirm('บังคับให้ทุกคน (ยกเว้นคุณ) ออกจากระบบ?')) return;
    await api('POST', '/sessions/revoke-all');
    toast('เตะทุกคนออกแล้ว');
  },
  async 'toggle-ban'(el) {
    await api('PUT', `/members/${el.dataset.id}`, { status: el.dataset.status });
    state.admin = null;
    render();
  },
};

// ---------- screenshot OCR (lazy-loaded /ocr.js + self-hosted Tesseract) ----------
let ocrSeq = 0;
const OCR_PHASES = [
  [/core/, 'กำลังโหลดตัวอ่านภาพ (ครั้งแรกเท่านั้น)'],
  [/traineddata/, 'กำลังโหลดข้อมูลภาษา (ครั้งแรกเท่านั้น)'],
  [/recogniz/, 'กำลังอ่านค่าจากรูป...'],
];
async function startOcr(file) {
  const m = state.modal;
  if (m?.kind !== 'ocr' || !file || m.status === 'loading') return;
  if (!file.type.startsWith('image/')) return toast('ต้องเป็นไฟล์รูปภาพ', true);
  const rid = ++ocrSeq;
  Object.assign(m, { rid, status: 'loading', progress: 0, label: 'กำลังเตรียมรูป...', error: '', raw: '', missing: [] });
  state.edit.__ocr = { stats: {} };
  render();
  // the user may close the modal / leave the page while we work: never touch state after that
  const alive = () => state.modal === m && m.rid === rid;
  const onProgress = (p) => {
    if (!alive()) return;
    const phase = OCR_PHASES.find(([re]) => re.test(p.status || ''));
    m.label = phase ? phase[1] : 'กำลังเตรียมตัวอ่านภาพ...';
    m.progress = Number(p.progress) || 0;
    const bar = $app.querySelector('[data-ocr-progress]');
    if (bar) bar.value = m.progress;
    const lab = $app.querySelector('[data-ocr-label]');
    if (lab) lab.textContent = m.label;
  };
  try {
    const ocr = await import('/ocr.js');
    const { canvas, preview } = await ocr.prepareImage(file);
    if (!alive()) return;
    m.preview = preview;
    render();
    const res = await ocr.recognizeCanvas(canvas, onProgress);
    if (!alive()) return;
    state.edit.__ocr = { stats: { ...res.stats } };
    Object.assign(m, { status: 'done', raw: res.raw, missing: res.missing });
  } catch (e) {
    if (!alive()) return;
    Object.assign(m, { status: 'error', error: 'อ่านรูปไม่สำเร็จ: ' + (e?.message || 'ไม่ทราบสาเหตุ') + ' — ลองรูปอื่น หรือกรอกเอง' });
  }
  render();
}

const imageOf = (files) => [...(files || [])].find((f) => f.type?.startsWith('image/'));
document.addEventListener('paste', (ev) => {
  if (state.modal?.kind !== 'ocr') return;
  const f = imageOf(ev.clipboardData?.files);
  if (f) ev.preventDefault(), startOcr(f);
});
document.addEventListener('dragover', (ev) => {
  if (state.modal?.kind !== 'ocr') return;
  ev.preventDefault();
  ev.target.closest?.('[data-drop]')?.classList.add('over');
});
document.addEventListener('dragleave', (ev) => ev.target.closest?.('[data-drop]')?.classList.remove('over'));
document.addEventListener('drop', (ev) => {
  if (state.modal?.kind !== 'ocr') return;
  ev.preventDefault(); // never let the browser navigate to a dropped file
  ev.target.closest?.('[data-drop]')?.classList.remove('over');
  const f = imageOf(ev.dataTransfer?.files);
  if (f) startOcr(f);
});

const forms = {
  async unlock(f) {
    try {
      setUnlock(await api('POST', '/unlock', { password: f.password.value }));
      const next = sessionStorage.getItem(NEXT_KEY);
      sessionStorage.removeItem(NEXT_KEY);
      if (next && next !== location.hash) location.hash = next;
      else render();
    } catch (e) {
      f.password.value = '';
      const [code, n] = e.message.split(':');
      if (code === 'wrong_password') toast(`รหัสไม่ถูกต้อง (เหลือ ${n} ครั้ง)`, true);
      else if (code === 'locked_until') toast(`ใส่รหัสผิดหลายครั้ง ล็อคถึง ${new Date(Number(n)).toLocaleTimeString('th-TH')}`, true);
      else toast(errMsg(e), true);
    }
  },
  async setup(f) {
    if (f.password.value !== f.confirm.value) return toast('รหัสยืนยันไม่ตรงกัน', true);
    setUnlock(await api('POST', '/password/setup', { password: f.password.value }));
    state.passwordSet = true;
    toast('ตั้งรหัสกิลด์แล้ว');
    render();
  },
  async password(f) {
    if (f.next.value !== f.confirm.value) return toast('รหัสยืนยันไม่ตรงกัน', true);
    setUnlock(await api('POST', '/password', { current: f.current.value, next: f.next.value }));
    f.reset();
    toast('เปลี่ยนรหัสแล้ว — แจ้งรหัสใหม่ให้สมาชิกทางช่องทางส่วนตัว');
    state.admin = null;
    render();
  },
  async import(f) {
    const json = f.json.value.trim();
    const r = await api('POST', '/import', json ? { json } : { guildCode: f.guildCode.value.trim() });
    toast(`นำเข้าแล้ว: ${r.targets} ทีมศัตรู, ${r.counters} ทีมแก้, ${r.plans} แผน`);
    state.admin = null;
    await refresh();
  },
  async 'add-member'(f) {
    await api('POST', '/members', { discordId: f.discordId.value.trim(), note: f.note.value.trim(), role: f.role.value });
    toast('เพิ่มสมาชิกแล้ว');
    state.admin = null;
    render();
  },
};

document.addEventListener('click', async (ev) => {
  const el = ev.target.closest('[data-action]');
  // clicks inside a modal bubble up to the backdrop; only a direct backdrop click closes it
  if (!el || (el.classList.contains('modal-bg') && ev.target !== el) || el.disabled) return;
  ev.preventDefault();
  try {
    await actions[el.dataset.action]?.(el);
  } catch (e) {
    if (e.status !== 423 && e.status !== 401) toast(errMsg(e), true);
  }
});

document.addEventListener('submit', async (ev) => {
  const f = ev.target.closest('[data-form]');
  if (!f) return;
  ev.preventDefault();
  const btn = f.querySelector('button');
  btn && (btn.disabled = true);
  try {
    await forms[f.dataset.form]?.(f);
  } catch (e) {
    if (e.status !== 423 && e.status !== 401) toast(errMsg(e), true);
  } finally {
    btn && (btn.disabled = false);
  }
});

document.addEventListener('input', (ev) => {
  const el = ev.target;
  if (el.dataset.bind && state.edit) setPath(state.edit, el.dataset.bind, readInput(el));
  if (el.hasAttribute('data-dock-q')) {
    state.dock.q = el.value;
    const words = el.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    for (const c of $app.querySelectorAll('.dcard')) c.hidden = !words.every((w) => c.dataset.search.includes(w));
    for (const g of $app.querySelectorAll('.ggroup')) g.hidden = !g.querySelector('.dcard:not([hidden])');
  }
  if (el.dataset.filter) {
    state[el.dataset.filter] = el.value;
    const pos = el.selectionStart;
    render();
    const again = $app.querySelector(`[data-filter="${el.dataset.filter}"]`);
    if (again?.tagName === 'INPUT') again.focus(), again.setSelectionRange(pos, pos);
  }
});

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter' && ev.target.hasAttribute?.('data-tag-input')) {
    ev.preventDefault();
    const t = normTags([ev.target.value.trim().slice(0, 20)])[0];
    if (t && state.edit && !state.edit.tags.includes(t)) toggleTag(t);
    return render();
  }
  // role="button" board slots: Enter / Space activate them
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches?.('[role="button"][data-action]')) {
    ev.preventDefault();
    return ev.target.click();
  }
  if (ev.key !== 'Escape') return;
  if (state.modal) actions['modal-close']();
  else if (state.sel) (state.sel = null), render();
});

document.addEventListener('change', async (ev) => {
  const el = ev.target;
  if (el.hasAttribute('data-ocr-file')) {
    const f = el.files?.[0];
    el.value = '';
    if (f) startOcr(f);
    return;
  }
  if (el.dataset.bind && el.hasAttribute('data-rerender')) render();
  if (el.dataset.memberRole) {
    try {
      await api('PUT', `/members/${el.dataset.memberRole}`, { role: el.value });
      toast('อัปเดตสิทธิ์แล้ว');
    } catch (e) {
      toast(errMsg(e), true);
    }
  }
});

boot();
