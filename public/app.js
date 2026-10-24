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
const ROLE_LABEL = { viewer: 'ดูอย่างเดียว', editor: 'แก้ไขได้', admin: 'แอดมิน' };
const IDLE_LOCK_MS = 30 * 60e3;
const NEXT_KEY = 'egg2k:next';

// Unlock token is kept in memory only: reloading / closing the tab always asks for the password again.
const state = { me: null, passwordSet: false, token: null, exp: 0, data: null, edit: null, admin: null, picker: null, lastActive: Date.now(), q: '', tag: '' };

// ---------- game assets (self-hosted images, see scripts/fetch-assets.mjs) ----------
const AS = { hero: new Map(), pet: new Map(), heroes: [], pets: [], sets: {}, rings: {} };
const AWAKE_RE = /^(.*?)(\s+awake(?:\s+epic)?)?$/i;

function buildAssets(a) {
  Object.assign(AS, { heroes: a.heroes, pets: a.pets, sets: a.sets, rings: a.rings });
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

// ---------- team rendering ----------
function teamView(team, skills = team?.skills || []) {
  const f = team?.front || 2;
  const slot = (i) => {
    const n = team.slots[i];
    if (!n) return html`<div class="slot empty">·</div>`;
    const h = heroInfo(n);
    return html`<div class="slot ${h.img ? 'has-img' : ''}" title="${n}">${portrait(h.img)}${h.awake ? html`<span class="awk">AWK</span>` : ''}<span class="nm">${h.base}</span></div>`;
  };
  const extras = (team.extras || []).filter(Boolean);
  return html`<div class="team">
    <div class="formation">รูปแบบ${FORMATIONS[f] || ''} <span class="muted">หน้า ${f} / หลัง ${5 - f}</span>${team.speed ? html` · <span class="speed">สปีด ${team.speed}</span>` : ''}</div>
    <div class="rows">
      <div class="row"><span class="row-label">หน้า</span>${[...Array(f).keys()].map(slot)}</div>
      <div class="row"><span class="row-label">หลัง</span>${[...Array(5 - f).keys()].map((i) => slot(i + f))}</div>
    </div>
    <div class="team-meta">
      ${team.pet ? petChip(team.pet) : ''}
      ${extras.length ? html`<span class="muted">สำรอง:</span> ${extras.map(petChip)}` : ''}
    </div>
    ${skills.length ? html`<div class="skills">${skills.map((s, i) => html`<span class="skill"><b>${i + 1}</b> ${team.slots[s.slot] || `ช่อง ${s.slot + 1}`} สกิล${s.skill}</span>`)}</div>` : ''}
  </div>`;
}

function heroNotesView(notes) {
  const list = (notes || []).filter((n) => n.text || n.sets.length || n.rings.length || Object.keys(n.stats).length);
  if (!list.length) return '';
  return html`<div class="hero-notes">${list.map(
    (n) => html`<div class="hero-note">
      <div class="hn-name">${portrait(heroInfo(n.hero).img, 'ico lg')}${n.hero}</div>
      ${n.sets.length ? html`<div class="icon-row"><span class="muted">เซ็ต:</span> ${n.sets.map((s) => iconChip(AS.sets[s], s))}</div>` : ''}
      ${n.rings.length ? html`<div class="icon-row"><span class="muted">แหวน:</span> ${n.rings.map((s) => iconChip(AS.rings[s], s))}</div>` : ''}
      ${Object.keys(n.stats).length ? html`<div class="stats">${Object.entries(n.stats).map(([k, v]) => html`<span class="stat">${STAT_LABEL[k] || k} <b>${v}</b></span>`)}</div>` : ''}
      ${n.text ? html`<div class="pre">${n.text}</div>` : ''}
    </div>`,
  )}</div>`;
}

// ---------- team editor (bound to state.edit via data-bind paths) ----------
function teamEditor(prefix, team, skills, skillsPath, notes, notesPath) {
  const f = team.front || 2;
  const pickBtn = (kind, path, value, placeholder) => {
    const img = kind === 'hero' ? heroInfo(value).img : AS.pet.get(value)?.img;
    return html`<button type="button" class="slot pick ${value ? 'has-img' : 'empty'}" data-action="pick" data-kind="${kind}" data-path="${path}">
      ${value ? html`${portrait(img)}${kind === 'hero' && heroInfo(value).awake ? html`<span class="awk">AWK</span>` : ''}<span class="nm">${kind === 'hero' ? heroInfo(value).base : value}</span>` : html`<span class="nm">+ ${placeholder}</span>`}
    </button>`;
  };
  const slotInput = (i) => pickBtn('hero', `${prefix}.slots.${i}`, team.slots[i], `ช่อง ${i + 1}`);
  return html`<div class="team-editor">
    <div class="grid2">
      <label>รูปแบบ
        <select data-bind="${prefix}.front" data-type="num" data-rerender>
          ${Object.entries(FORMATIONS).map(([k, v]) => html`<option value="${k}" ${Number(k) === f ? raw('selected') : ''}>${v} (หน้า ${k} / หลัง ${5 - k})</option>`)}
        </select>
      </label>
      <label>สปีดรวม <input type="number" min="0" value="${team.speed || ''}" data-bind="${prefix}.speed" data-type="num" /></label>
    </div>
    <div class="rows edit">
      <div class="row"><span class="row-label">หน้า</span>${[...Array(f).keys()].map(slotInput)}</div>
      <div class="row"><span class="row-label">หลัง</span>${[...Array(5 - f).keys()].map((i) => slotInput(i + f))}</div>
    </div>
    <div class="grid2">
      <div><span class="lbl">สัตว์เลี้ยง</span><div class="pet-pick">${pickBtn('pet', `${prefix}.pet`, team.pet, 'สัตว์เลี้ยง')}</div></div>
      <div><span class="lbl">สัตว์เลี้ยงสำรอง</span><div class="extras">${[0, 1, 2, 3].map((i) => pickBtn('pet', `${prefix}.extras.${i}`, team.extras[i], 'สำรอง'))}</div></div>
    </div>
    <div class="skill-editor">
      <span class="lbl">ลำดับสกิล</span>
      ${skills.map(
        (s, i) => html`<div class="skill-row"><b>${i + 1}</b>
          <select data-bind="${skillsPath}.${i}.slot" data-type="num">${team.slots.map((h, si) =>
            h ? html`<option value="${si}" ${s.slot === si ? raw('selected') : ''}>${h}</option>` : '',
          )}</select>
          <select data-bind="${skillsPath}.${i}.skill" data-type="num">${[1, 2].map((k) => html`<option value="${k}" ${s.skill === k ? raw('selected') : ''}>สกิล ${k}</option>`)}</select>
          <button class="btn small ghost" data-action="skill-del" data-path="${skillsPath}" data-i="${i}">ลบ</button>
        </div>`,
      )}
      ${heroesOf(team).length && skills.length < 6 ? html`<button class="btn small" data-action="skill-add" data-path="${skillsPath}" data-team="${prefix}">+ เพิ่มสกิล</button>` : ''}
    </div>
    ${notes
      ? html`<div class="hn-editor">${notes.map(
          (n, i) => html`<fieldset>
            <legend>${portrait(heroInfo(n.hero).img, 'ico lg')}${n.hero}</legend>
            <div class="grid2">
              <label>เซ็ต (คั่นด้วย ,) <input list="dl-sets" value="${n.sets.join(', ')}" data-bind="${notesPath}.${i}.sets" data-type="list" /></label>
              <label>แหวน (คั่นด้วย ,) <input list="dl-rings" value="${n.rings.join(', ')}" data-bind="${notesPath}.${i}.rings" data-type="list" /></label>
            </div>
            <div class="stat-grid">${STATS.map(
              ([k, l]) => html`<label>${l}<input type="number" step="any" value="${n.stats[k] ?? ''}" data-bind="${notesPath}.${i}.stats.${k}" data-type="stat" /></label>`,
            )}</div>
            <label>โน้ต <textarea rows="2" data-bind="${notesPath}.${i}.text">${n.text}</textarea></label>
          </fieldset>`,
        )}</div>`
      : ''}
  </div>`;
}

// keep heroNotes / skills consistent with heroes in the team
function syncTeam(team, skills, notes) {
  for (let i = skills.length - 1; i >= 0; i--) if (!team.slots[skills[i].slot]) skills.splice(i, 1);
  if (!notes) return;
  const heroes = heroesOf(team);
  const next = heroes.map((h) => notes.find((n) => n.hero === h) || { hero: h, text: '', sets: [], rings: [], stats: {} });
  notes.splice(0, notes.length, ...next);
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
  return html`<section class="hero-card">
    <div class="kicker">GUILD WAR · SEVEN KNIGHTS RE:BIRTH</div>
    <h1>EGG2K<br /><span class="gold">MEMBERS ONLY.</span></h1>
    <p class="muted">เข้าสู่ระบบด้วย Discord (เฉพาะสมาชิกกิลด์) แล้วใส่รหัสกิลด์ทุกครั้งที่เปิดเว็บ</p>
    <button class="btn discord" data-action="login">Login ด้วย Discord</button>
  </section>`;
}

function viewUnlock() {
  if (!state.passwordSet) {
    return can('admin')
      ? html`<section class="hero-card narrow">
          <h2>ตั้งรหัสกิลด์ครั้งแรก</h2>
          <p class="muted">สมาชิกทุกคนต้องใช้รหัสนี้ทุกครั้งที่เปิดเว็บ (อย่างน้อย 8 ตัวอักษร)</p>
          <form data-form="setup">
            <input type="password" name="password" placeholder="รหัสใหม่" autocomplete="new-password" required minlength="8" />
            <input type="password" name="confirm" placeholder="ยืนยันรหัส" autocomplete="new-password" required minlength="8" />
            <button class="btn primary">บันทึกรหัส</button>
          </form>
        </section>`
      : html`<section class="hero-card narrow"><h2>ยังไม่ได้ตั้งรหัสกิลด์</h2><p class="muted">รอแอดมินตั้งรหัสก่อนใช้งาน</p></section>`;
  }
  return html`<section class="hero-card narrow">
    <div class="who">${state.me.avatar ? html`<img src="${state.me.avatar}" alt="" />` : ''} ${state.me.name}</div>
    <h2>🔒 ใส่รหัสกิลด์</h2>
    <form data-form="unlock">
      <input type="password" name="password" placeholder="รหัสกิลด์" autocomplete="current-password" required autofocus />
      <button class="btn primary">ปลดล็อค</button>
    </form>
    <p class="muted small">รหัสจะถูกถามทุกครั้งที่เปิด/รีเฟรชหน้าเว็บ และล็อคอัตโนมัติเมื่อไม่ได้ใช้งาน 30 นาที</p>
  </section>`;
}

function targetCard(t) {
  return html`<a class="card" href="#/t/${t.id}">
    ${teamView(t.team)}
    <div class="card-foot">
      ${t.tags.map((x) => html`<span class="tag">${x}</span>`)}
      <span class="count">${t.counters.length} ทีมแก้</span>
    </div>
  </a>`;
}

function viewTargets() {
  const q = state.q.trim().toLowerCase();
  const names = allNames();
  const list = state.data.targets.filter((t) => {
    if (state.tag && !t.tags.includes(state.tag)) return false;
    if (!q) return true;
    const hay = [...heroesOf(t.team), t.team.pet, ...t.tags, t.note].join(' ').toLowerCase();
    return q.split(/\s+/).every((w) => hay.includes(w));
  });
  return html`<div class="toolbar">
      <h2>ทีมศัตรู <span class="muted">(${list.length})</span></h2>
      <input class="search" type="search" placeholder="ค้นหาฮีโร่ / สัตว์เลี้ยง / แท็ก" value="${state.q}" data-filter="q" list="dl-heroes" />
      <select data-filter="tag"><option value="">ทุกแท็ก</option>${names.tags.map((x) => html`<option ${state.tag === x ? raw('selected') : ''}>${x}</option>`)}</select>
      ${can('editor') ? html`<a class="btn primary" href="#/new">+ เพิ่มทีมศัตรู</a>` : ''}
    </div>
    ${datalists()}
    <div class="cards">${list.map(targetCard)}</div>
    ${list.length ? '' : html`<p class="center muted">ไม่พบทีม</p>`}`;
}

function viewTarget(id) {
  const t = findTarget(id);
  if (!t) return html`<p class="center muted">ไม่พบทีมนี้ (อาจถูกลบไปแล้ว)</p>`;
  const by = (uid) => state.data.names[uid] || '';
  return html`<div class="toolbar">
      <a class="btn ghost" href="#/">← กลับ</a>
      <h2>ทีมศัตรู</h2>
      <button class="btn" data-action="share" data-hash="#/t/${t.id}">🔗 แชร์ลิงก์</button>
      ${can('editor') ? html`<a class="btn" href="#/t/${t.id}/edit">แก้ไข</a><button class="btn danger" data-action="del-target" data-id="${t.id}">ลบ</button>` : ''}
    </div>
    <div class="panel enemy">
      ${teamView(t.team)}
      ${t.tags.length ? html`<div>${t.tags.map((x) => html`<span class="tag">${x}</span>`)}</div>` : ''}
      ${t.note ? html`<div class="pre note">${t.note}</div>` : ''}
      <div class="muted small">อัปเดต ${fmtDate(t.updatedAt)}</div>
    </div>
    <div class="toolbar">
      <h3>ทีมแก้ (${t.counters.length})</h3>
      ${can('editor') ? html`<a class="btn primary" href="#/t/${t.id}/c/new">+ เพิ่มทีมแก้</a>` : ''}
    </div>
    <div class="counters">${t.counters.map(
      (c, i) => html`<div class="panel counter">
        <div class="counter-head"><b>ทีมแก้ #${i + 1}</b>
          <span class="muted small">${by(c.createdBy)} · ${fmtDate(c.updatedAt)}</span>
          ${can('editor') ? html`<span class="spacer"></span><a class="btn small" href="#/t/${t.id}/c/${c.id}/edit">แก้ไข</a><button class="btn small danger" data-action="del-counter" data-id="${c.id}">ลบ</button>` : ''}
        </div>
        ${teamView(c.team, c.skills)}
        ${c.note ? html`<div class="pre note">${c.note}</div>` : ''}
        ${heroNotesView(c.heroNotes)}
      </div>`,
    )}</div>
    ${t.counters.length ? '' : html`<p class="center muted">ยังไม่มีทีมแก้</p>`}`;
}

function viewTargetEdit(id) {
  if (!state.edit || state.edit.__key !== `t:${id}`) {
    const t = id === 'new' ? null : findTarget(id);
    if (id !== 'new' && !t) return html`<p class="center muted">ไม่พบทีม</p>`;
    const team = t ? clone(t.team) : emptyTeam();
    state.edit = { __key: `t:${id}`, team, skills: team.skills || [], tags: t ? [...t.tags] : [], note: t?.note || '' };
  }
  const e = state.edit;
  syncTeam(e.team, e.skills);
  return html`${datalists()}<div class="toolbar"><a class="btn ghost" href="${id === 'new' ? '#/' : `#/t/${id}`}">← ยกเลิก</a><h2>${id === 'new' ? 'เพิ่มทีมศัตรู' : 'แก้ไขทีมศัตรู'}</h2></div>
    <div class="panel">
      ${teamEditor('team', e.team, e.skills, 'skills')}
      <label>แท็ก (คั่นด้วย ,) <input list="dl-tags" value="${e.tags.join(', ')}" data-bind="tags" data-type="list" /></label>
      <label>โน้ต <textarea rows="3" data-bind="note">${e.note}</textarea></label>
      <div class="actions"><button class="btn primary" data-action="save-target" data-id="${id}">บันทึก</button></div>
    </div>`;
}

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
  return html`${datalists()}<div class="toolbar"><a class="btn ghost" href="#/t/${tid}">← ยกเลิก</a><h2>${cid === 'new' ? 'เพิ่มทีมแก้' : 'แก้ไขทีมแก้'}</h2></div>
    <div class="panel enemy compact"><div class="muted small">ทีมศัตรู</div>${teamView(t.team)}</div>
    <div class="panel">
      ${teamEditor('team', e.team, e.skills, 'skills', e.heroNotes, 'heroNotes')}
      <label>โน้ตทีม <textarea rows="3" data-bind="note">${e.note}</textarea></label>
      <div class="actions"><button class="btn primary" data-action="save-counter" data-tid="${tid}" data-id="${cid}">บันทึก</button></div>
    </div>`;
}

function viewPlans() {
  return html`<div class="toolbar"><h2>แผนวอร์ <span class="muted">(${state.data.plans.length})</span></h2>
      ${can('editor') ? html`<a class="btn primary" href="#/p/new/edit">+ สร้างแผน</a>` : ''}</div>
    <div class="list">${state.data.plans.map(
      (p) => html`<a class="list-item" href="#/p/${p.id}">
        <b>${p.title}</b>
        <span class="tag">${p.data.kind === 'attack' ? 'บุก' : 'ป้องกัน'}</span>
        <span class="muted small">${(p.data.slots || []).length} ไม้ · ${fmtDate(p.updatedAt)}</span>
      </a>`,
    )}</div>
    ${state.data.plans.length ? '' : html`<p class="center muted">ยังไม่มีแผน</p>`}`;
}

function viewPlan(id) {
  const p = findPlan(id);
  if (!p) return html`<p class="center muted">ไม่พบแผน</p>`;
  return html`<div class="toolbar">
      <a class="btn ghost" href="#/plans">← กลับ</a>
      <h2>${p.title}</h2>
      <button class="btn" data-action="share" data-hash="#/p/${p.id}">🔗 แชร์ลิงก์</button>
      ${can('editor') ? html`<a class="btn" href="#/p/${p.id}/edit">แก้ไข</a><button class="btn danger" data-action="del-plan" data-id="${p.id}">ลบ</button>` : ''}
    </div>
    ${p.data.note ? html`<div class="panel pre note">${p.data.note}</div>` : ''}
    ${(p.data.slots || []).map(
      (s) => html`<div class="panel">
        <h3>${s.name}</h3>
        ${(s.options || []).map(
          (o, i) => html`<div class="option">
            ${s.options.length > 1 ? html`<div class="muted small">ตัวเลือก ${i + 1}</div>` : ''}
            ${o.condition ? html`<div class="condition">เงื่อนไข: ${o.condition}</div>` : ''}
            ${teamView(o.team || emptyTeam(), o.skills || [])}
            ${o.notes ? html`<div class="pre note">${o.notes}</div>` : ''}
            ${heroNotesView(o.heroNotes)}
          </div>`,
        )}
      </div>`,
    )}`;
}

function viewPlanEdit(id) {
  if (!state.edit || state.edit.__key !== `p:${id}`) {
    const p = id === 'new' ? null : findPlan(id);
    if (id !== 'new' && !p) return html`<p class="center muted">ไม่พบแผน</p>`;
    const data = p ? clone(p.data) : { kind: 'defense', note: '', slots: [] };
    data.slots ||= [];
    for (const s of data.slots) {
      s.options ||= [];
      for (const o of s.options) (o.team ||= emptyTeam()), (o.skills ||= []), (o.heroNotes ||= []), (o.condition ||= ''), (o.notes ||= '');
    }
    state.edit = { __key: `p:${id}`, title: p?.title || '', data };
  }
  const e = state.edit;
  return html`${datalists()}<div class="toolbar"><a class="btn ghost" href="${id === 'new' ? '#/plans' : `#/p/${id}`}">← ยกเลิก</a><h2>${id === 'new' ? 'สร้างแผน' : 'แก้ไขแผน'}</h2></div>
    <div class="panel">
      <div class="grid2">
        <label>ชื่อแผน <input value="${e.title}" data-bind="title" /></label>
        <label>ประเภท <select data-bind="data.kind">${[['defense', 'ป้องกัน'], ['attack', 'บุก']].map(([k, v]) => html`<option value="${k}" ${e.data.kind === k ? raw('selected') : ''}>${v}</option>`)}</select></label>
      </div>
      <label>โน้ตแผน <textarea rows="3" data-bind="data.note">${e.data.note || ''}</textarea></label>
    </div>
    ${e.data.slots.map((s, si) => {
      s.options.forEach((o) => syncTeam(o.team, o.skills, o.heroNotes));
      return html`<div class="panel">
        <div class="toolbar"><input class="slot-name" value="${s.name}" data-bind="data.slots.${si}.name" />
          <button class="btn small danger" data-action="plan-slot-del" data-i="${si}">ลบไม้นี้</button></div>
        ${s.options.map(
          (o, oi) => html`<div class="option">
            <div class="toolbar"><b>ตัวเลือก ${oi + 1}</b><button class="btn small ghost" data-action="plan-opt-del" data-i="${si}" data-j="${oi}">ลบตัวเลือก</button></div>
            <label>เงื่อนไข <input value="${o.condition}" data-bind="data.slots.${si}.options.${oi}.condition" /></label>
            ${teamEditor(`data.slots.${si}.options.${oi}.team`, o.team, o.skills, `data.slots.${si}.options.${oi}.skills`, o.heroNotes, `data.slots.${si}.options.${oi}.heroNotes`)}
            <label>โน้ต <textarea rows="2" data-bind="data.slots.${si}.options.${oi}.notes">${o.notes}</textarea></label>
          </div>`,
        )}
        <button class="btn small" data-action="plan-opt-add" data-i="${si}">+ เพิ่มตัวเลือกทีม</button>
      </div>`;
    })}
    <div class="actions">
      <button class="btn" data-action="plan-slot-add">+ เพิ่มไม้</button>
      <button class="btn primary" data-action="save-plan" data-id="${id}">บันทึกแผน</button>
    </div>`;
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
  return html`<h2>แอดมิน</h2>
    <div class="admin-grid">
      <div class="panel">
        <h3>🔑 เปลี่ยนรหัสกิลด์</h3>
        <p class="muted small">เมื่อเปลี่ยนรหัส ทุกคนที่เปิดเว็บอยู่จะถูกล็อคทันทีและต้องใช้รหัสใหม่</p>
        <form data-form="password">
          <input type="password" name="current" placeholder="รหัสปัจจุบัน" autocomplete="current-password" required />
          <input type="password" name="next" placeholder="รหัสใหม่ (8+ ตัว)" autocomplete="new-password" required minlength="8" />
          <input type="password" name="confirm" placeholder="ยืนยันรหัสใหม่" autocomplete="new-password" required minlength="8" />
          <button class="btn primary">เปลี่ยนรหัส</button>
        </form>
      </div>
      <div class="panel">
        <h3>🚪 ความปลอดภัย</h3>
        <p class="muted small">บังคับออกจากระบบทุกคน (ยกเว้นคุณ) ต้อง Login Discord ใหม่</p>
        <button class="btn danger" data-action="revoke-all">เตะทุกคนออกจากระบบ</button>
        <h3>📥 นำเข้าจาก 7k-note</h3>
        <form data-form="import">
          <input name="guildCode" placeholder="รหัสกิลด์ 7k-note เช่น SExN7AHJ" value="SExN7AHJ" />
          <textarea name="json" rows="3" placeholder="หรือวาง JSON ที่ export มา"></textarea>
          <button class="btn">นำเข้า (รวมกับข้อมูลเดิม)</button>
        </form>
      </div>
    </div>
    <div class="panel">
      <h3>👥 สมาชิก (${a.members.length})</h3>
      <form data-form="add-member" class="inline">
        <input name="discordId" placeholder="Discord User ID" required pattern="\\d{15,22}" />
        <input name="note" placeholder="ชื่อ (ไม่บังคับ)" />
        <select name="role">${Object.entries(ROLE_LABEL).map(([k, v]) => html`<option value="${k}" ${k === 'editor' ? raw('selected') : ''}>${v}</option>`)}</select>
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
      <h3>🕵️ บันทึกการใช้งาน</h3>
      <div class="table-wrap"><table>
        <thead><tr><th>เวลา</th><th>ผู้ใช้</th><th>การกระทำ</th><th>รายละเอียด</th><th>IP</th></tr></thead>
        <tbody>${a.audit.map(
          (l) => html`<tr class="${/fail|denied/.test(l.action) ? 'warn' : ''}"><td class="small">${fmtDate(l.ts)}</td><td>${l.name || l.discord_id || '-'}</td><td>${l.action}</td><td class="small">${l.detail}</td><td class="mono small">${l.ip}</td></tr>`,
        )}</tbody>
      </table></div>
    </div>`;
}

function viewPicker() {
  const p = state.picker;
  const list = p.kind === 'hero' ? AS.heroes : AS.pets;
  const rarities = [...new Set(list.map((x) => x.rarity))];
  const tiles = [];
  for (const x of list) {
    if (p.rarity && x.rarity !== p.rarity) continue;
    const search = x.aliases.join(' ').toLowerCase();
    tiles.push({ value: x.name, img: x.img, label: x.name, search });
    if (p.kind === 'hero' && x.awk) tiles.push({ value: `${x.name} awake`, img: x.awk, label: x.name, awk: true, search: `${search} awake awk` });
  }
  return html`<div class="modal-bg" data-action="pick-close">
    <div class="modal">
      <div class="toolbar">
        <h3>เลือก${p.kind === 'hero' ? 'ฮีโร่' : 'สัตว์เลี้ยง'}</h3>
        <input class="search" type="search" placeholder="ค้นหาชื่อ (ไทย/อังกฤษ)" data-pick-search />
        <button class="btn small ghost" data-action="pick-close">✕</button>
      </div>
      <div class="tabs">${['', ...rarities].map(
        (r) => html`<button class="btn small ${p.rarity === r ? 'active' : ''}" data-action="pick-rarity" data-r="${r}">${r || 'ทั้งหมด'}</button>`,
      )}</div>
      ${list.length ? '' : html`<p class="muted">ยังไม่มีไฟล์รูป — รัน <code>npm run assets</code></p>`}
      <div class="pick-grid">${tiles.map(
        (t) => html`<button type="button" class="tile ${t.value === p.current ? 'selected' : ''}" data-action="pick-set" data-value="${t.value}" data-search="${t.search}" title="${t.value}">
          ${portrait(t.img)}${t.awk ? html`<span class="awk">AWK</span>` : ''}<span class="nm">${t.label}</span>
        </button>`,
      )}</div>
      <div class="pick-foot">
        <button class="btn small danger" data-action="pick-set" data-value="">ล้างช่อง</button>
        <form data-form="pick-custom" class="inline"><input name="name" placeholder="ไม่มีในรายการ? พิมพ์ชื่อเอง" /><button class="btn small">ใช้ชื่อนี้</button></form>
      </div>
    </div>
  </div>`;
}

function setPicked(value) {
  setPath(state.edit, state.picker.path, value || null);
  state.picker = null;
  render();
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
  if (!state.me) return ($nav.innerHTML = '');
  const h = location.hash || '#/';
  const link = (href, label, active) => html`<a href="${href}" class="${active ? 'active' : ''}">${label}</a>`;
  $nav.innerHTML = fmt(html`
    ${state.token
      ? html`${link('#/', 'ทีมศัตรู', h === '#/' || h.startsWith('#/t') || h === '#/new')}${link('#/plans', 'แผน', h.startsWith('#/p'))}${can('admin') ? link('#/admin', 'แอดมิน', h === '#/admin') : ''}
        <button class="btn small ghost" data-action="lock" title="ล็อค">🔒</button>`
      : ''}
    <span class="user">${state.me.avatar ? html`<img src="${state.me.avatar}" alt="" />` : ''}<span>${state.me.name}</span><span class="role">${ROLE_LABEL[state.me.role]}</span></span>
    <button class="btn small ghost" data-action="logout">ออก</button>`);
}

function render() {
  renderNav();
  if (!state.me) return ($app.innerHTML = fmt(viewLogin()));
  if (!state.token) return ($app.innerHTML = fmt(viewUnlock()));
  if (!state.data) {
    $app.innerHTML = '<div class="center muted">กำลังโหลดข้อมูล...</div>';
    loadData().then(render, (e) => e.status !== 423 && toast(errMsg(e), true));
    return;
  }
  $app.innerHTML = fmt(route()) + (state.picker && state.edit ? fmt(viewPicker()) : '');
  $app.querySelector('[data-pick-search]')?.focus();
}

addEventListener('hashchange', () => {
  state.edit = null;
  state.picker = null;
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
  share: (el) => copyLink(el.dataset.hash),
  pick(el) {
    state.picker = { kind: el.dataset.kind, path: el.dataset.path, current: getPath(state.edit, el.dataset.path), rarity: '' };
    render();
  },
  'pick-close'() {
    state.picker = null;
    render();
  },
  'pick-rarity'(el) {
    state.picker.rarity = el.dataset.r;
    render();
  },
  'pick-set': (el) => setPicked(el.dataset.value),
  'skill-add'(el) {
    const team = getPath(state.edit, el.dataset.team);
    const skills = getPath(state.edit, el.dataset.path);
    skills.push({ slot: team.slots.findIndex(Boolean), skill: 1 });
    render();
  },
  'skill-del'(el) {
    getPath(state.edit, el.dataset.path).splice(Number(el.dataset.i), 1);
    render();
  },
  async 'save-target'(el) {
    const id = el.dataset.id;
    const e = state.edit;
    if (!heroesOf(e.team).length) return toast('ใส่ฮีโร่อย่างน้อย 1 ตัว', true);
    const body = { team: { ...e.team, skills: e.skills }, tags: e.tags, note: e.note };
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
    slots.push({ name: `ไม้ ${slots.length + 1}`, kind: state.edit.data.kind, options: [{ team: emptyTeam(), skills: [], heroNotes: [], condition: '', notes: '' }] });
    render();
  },
  'plan-slot-del'(el) {
    if (confirm('ลบไม้นี้?')) state.edit.data.slots.splice(Number(el.dataset.i), 1), render();
  },
  'plan-opt-add'(el) {
    state.edit.data.slots[el.dataset.i].options.push({ team: emptyTeam(), skills: [], heroNotes: [], condition: '', notes: '' });
    render();
  },
  'plan-opt-del'(el) {
    state.edit.data.slots[el.dataset.i].options.splice(Number(el.dataset.j), 1);
    render();
  },
  async 'save-plan'(el) {
    const id = el.dataset.id;
    const body = { title: state.edit.title, data: state.edit.data };
    const r = id === 'new' ? await api('POST', '/plans', body) : await api('PUT', `/plans/${id}`, body);
    toast('บันทึกแล้ว');
    await refresh(`#/p/${id === 'new' ? r.id : id}`);
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
  'pick-custom'(f) {
    const name = f.name.value.trim();
    if (name) setPicked(name.slice(0, 60));
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
  // clicks inside the picker modal bubble up to the backdrop; only a direct backdrop click closes it
  if (!el || (el.classList.contains('modal-bg') && ev.target !== el)) return;
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
  if (el.hasAttribute('data-pick-search')) {
    const words = el.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    for (const t of $app.querySelectorAll('.pick-grid .tile')) t.hidden = !words.every((w) => t.dataset.search.includes(w));
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
  if (ev.key === 'Escape' && state.picker) actions['pick-close']();
});

document.addEventListener('change', async (ev) => {
  const el = ev.target;
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
