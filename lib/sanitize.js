import { HttpError } from './util.js';

export const STAT_KEYS = ['atk', 'def', 'hp', 'spd', 'critRate', 'critDmg', 'weak', 'block', 'hit', 'resist', 'dtr', 'amp', 'crush', 'resil', 'rejuv'];

const str = (v, max = 60) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const text = (v, max = 2000) => (typeof v === 'string' ? v.slice(0, max) : '');
const int = (v, min, max, def = 0) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};
const strList = (v, n, max = 40) => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean).slice(0, n) : []);
const fixed = (v, n) => Array.from({ length: n }, (_, i) => str(Array.isArray(v) ? v[i] : null));

export function team(t) {
  if (!t || typeof t !== 'object') throw new HttpError(400, 'invalid_team');
  return {
    front: int(t.front, 1, 4, 2),
    slots: fixed(t.slots, 5),
    pet: str(t.pet),
    extras: fixed(t.extras, 4),
    speed: int(t.speed, 0, 99999),
  };
}

export function skills(v) {
  return (Array.isArray(v) ? v : []).slice(0, 6).map((s) => ({ slot: int(s?.slot, 0, 4), skill: int(s?.skill, 1, 3, 1) }));
}

export function heroNotes(v) {
  return (Array.isArray(v) ? v : []).slice(0, 5).map((h) => {
    const stats = {};
    for (const k of STAT_KEYS) {
      const n = Number(h?.stats?.[k]);
      if (h?.stats?.[k] !== '' && h?.stats?.[k] != null && Number.isFinite(n)) stats[k] = n;
    }
    return { hero: str(h?.hero) || '', text: text(h?.text, 500), sets: strList(h?.sets, 4), rings: strList(h?.rings, 4), stats };
  });
}

export function target(body) {
  return { team: team(body.team), tags: strList(body.tags, 10, 20), note: text(body.note), skills: skills(body.team?.skills ?? body.skills) };
}

export function counter(body) {
  return { team: team(body.team), skills: skills(body.skills), heroNotes: heroNotes(body.heroNotes), note: text(body.note) };
}

export function plan(body) {
  const title = str(body.title, 100);
  if (!title) throw new HttpError(400, 'title_required');
  const data = body.data && typeof body.data === 'object' ? body.data : {};
  const raw = JSON.stringify(data);
  if (raw.length > 200000) throw new HttpError(413, 'too_large');
  return { title, data: raw };
}

export function password(p) {
  if (typeof p !== 'string' || p.length < 8 || p.length > 128) throw new HttpError(400, 'password_length');
  return p;
}
