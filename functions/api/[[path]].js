import {
  getSetting,
  issueUnlock,
  requireRole,
  requireSession,
  requireUnlock,
  ROLES,
  setSettings,
} from '../../lib/auth.js';
import * as S from '../../lib/sanitize.js';
import { audit, hashPassword, HttpError, json, newId, safeEqual } from '../../lib/util.js';

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
const SEVEN_K_NOTE_API = 'https://7k-note-api.krit7k.workers.dev/api/guild/';

const routes = [];
const on = (method, pattern, opts, handler) => {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '$');
  routes.push({ method, re, keys, opts, handler });
};

const parse = (s, d) => {
  try {
    return JSON.parse(s);
  } catch {
    return d;
  }
};

const publicMember = (m) => ({
  id: m.discord_id,
  username: m.username,
  name: m.global_name || m.username,
  avatar: m.avatar ? `https://cdn.discordapp.com/avatars/${m.discord_id}/${m.avatar}.png?size=64` : null,
  role: m.role,
  status: m.status,
  lastSeen: m.last_seen,
  createdAt: m.created_at,
});

// ---------- auth / password ----------

on('GET', '/me', { unlock: false }, async ({ env, ctx }) => ({
  user: publicMember(ctx.member),
  passwordSet: !!(await getSetting(env, 'pw_hash')),
}));

on('POST', '/unlock', { unlock: false }, async ({ env, request, ctx, body }) => {
  const id = ctx.member.discord_id;
  const now = Date.now();
  const att = (await env.DB.prepare('SELECT * FROM login_attempts WHERE discord_id = ?').bind(id).first()) || { fails: 0, locked_until: 0 };
  if (att.locked_until > now) throw new HttpError(429, `locked_until:${att.locked_until}`);

  const [hash, salt] = await Promise.all([getSetting(env, 'pw_hash'), getSetting(env, 'pw_salt')]);
  if (!hash) throw new HttpError(409, 'password_not_set');
  const ok = typeof body.password === 'string' && safeEqual((await hashPassword(body.password, salt)).hash, hash);

  if (!ok) {
    const fails = att.fails + 1;
    const locked = fails >= MAX_FAILS ? now + LOCK_MINUTES * 60e3 : 0;
    await env.DB.prepare(
      `INSERT INTO login_attempts (discord_id, fails, locked_until) VALUES (?, ?, ?)
       ON CONFLICT(discord_id) DO UPDATE SET fails = excluded.fails, locked_until = excluded.locked_until`,
    )
      .bind(id, locked ? 0 : fails, locked)
      .run();
    await audit(env, request, id, 'unlock_fail', locked ? 'locked' : `fail ${fails}`);
    throw new HttpError(locked ? 429 : 403, locked ? `locked_until:${locked}` : `wrong_password:${MAX_FAILS - fails}`);
  }
  await env.DB.prepare('DELETE FROM login_attempts WHERE discord_id = ?').bind(id).run();
  await audit(env, request, id, 'unlock');
  return issueUnlock(env, ctx.member, ctx.sessionHash);
});

async function savePassword(env, pw) {
  const { hash, salt } = await hashPassword(pw);
  const v = Number((await getSetting(env, 'pw_version')) || 0) + 1;
  await setSettings(env, { pw_hash: hash, pw_salt: salt, pw_version: v, pw_changed_at: Date.now() });
}

on('POST', '/password/setup', { unlock: false, role: 'admin' }, async ({ env, request, ctx, body }) => {
  if (await getSetting(env, 'pw_hash')) throw new HttpError(409, 'password_already_set');
  await savePassword(env, S.password(body.password));
  await audit(env, request, ctx.member.discord_id, 'password_setup');
  return issueUnlock(env, ctx.member, ctx.sessionHash);
});

on('POST', '/password', { role: 'admin' }, async ({ env, request, ctx, body }) => {
  const [hash, salt] = await Promise.all([getSetting(env, 'pw_hash'), getSetting(env, 'pw_salt')]);
  if (typeof body.current !== 'string' || !safeEqual((await hashPassword(body.current, salt)).hash, hash)) {
    throw new HttpError(403, 'wrong_password');
  }
  await savePassword(env, S.password(body.next));
  await audit(env, request, ctx.member.discord_id, 'password_change');
  return issueUnlock(env, ctx.member, ctx.sessionHash);
});

// ---------- data ----------

function targetOut(t, counters) {
  return {
    id: t.id,
    team: parse(t.team, {}),
    tags: parse(t.tags, []),
    note: t.note,
    createdBy: t.created_by,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    counters: counters.map((c) => ({
      id: c.id,
      targetId: c.target_id,
      team: parse(c.team, {}),
      skills: parse(c.skills, []),
      heroNotes: parse(c.hero_notes, []),
      note: c.note,
      createdBy: c.created_by,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })),
  };
}

on('GET', '/data', {}, async ({ env }) => {
  const [t, c, p, m] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM targets ORDER BY updated_at DESC'),
    env.DB.prepare('SELECT * FROM counters ORDER BY created_at ASC'),
    env.DB.prepare('SELECT * FROM plans ORDER BY created_at DESC'),
    env.DB.prepare('SELECT discord_id, username, global_name FROM members'),
  ]);
  const byTarget = {};
  for (const row of c.results) (byTarget[row.target_id] ||= []).push(row);
  return {
    targets: t.results.map((row) => targetOut(row, byTarget[row.id] || [])),
    plans: p.results.map((row) => ({ id: row.id, title: row.title, data: parse(row.data, {}), createdAt: row.created_at, updatedAt: row.updated_at })),
    names: Object.fromEntries(m.results.map((r) => [r.discord_id, r.global_name || r.username])),
  };
});

on('POST', '/targets', { role: 'editor' }, async ({ env, request, ctx, body }) => {
  const s = S.target(body);
  const id = newId();
  const now = Date.now();
  await env.DB.prepare('INSERT INTO targets (id, team, tags, note, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, JSON.stringify({ ...s.team, skills: s.skills }), JSON.stringify(s.tags), s.note, ctx.member.discord_id, now, now)
    .run();
  await audit(env, request, ctx.member.discord_id, 'target_create', id);
  return { id };
});

on('PUT', '/targets/:id', { role: 'editor' }, async ({ env, ctx, body, params }) => {
  const s = S.target(body);
  const r = await env.DB.prepare('UPDATE targets SET team = ?, tags = ?, note = ?, updated_at = ? WHERE id = ?')
    .bind(JSON.stringify({ ...s.team, skills: s.skills }), JSON.stringify(s.tags), s.note, Date.now(), params.id)
    .run();
  if (!r.meta.changes) throw new HttpError(404, 'not_found');
  return { ok: true };
});

on('DELETE', '/targets/:id', { role: 'editor' }, async ({ env, request, ctx, params }) => {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM counters WHERE target_id = ?').bind(params.id),
    env.DB.prepare('DELETE FROM targets WHERE id = ?').bind(params.id),
  ]);
  await audit(env, request, ctx.member.discord_id, 'target_delete', params.id);
  return { ok: true };
});

on('POST', '/targets/:id/counters', { role: 'editor' }, async ({ env, ctx, body, params }) => {
  if (!(await env.DB.prepare('SELECT id FROM targets WHERE id = ?').bind(params.id).first())) throw new HttpError(404, 'not_found');
  const s = S.counter(body);
  const id = newId();
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO counters (id, target_id, team, skills, hero_notes, note, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(id, params.id, JSON.stringify(s.team), JSON.stringify(s.skills), JSON.stringify(s.heroNotes), s.note, ctx.member.discord_id, now, now),
    env.DB.prepare('UPDATE targets SET updated_at = ? WHERE id = ?').bind(now, params.id),
  ]);
  return { id };
});

on('PUT', '/counters/:id', { role: 'editor' }, async ({ env, body, params }) => {
  const s = S.counter(body);
  const r = await env.DB.prepare('UPDATE counters SET team = ?, skills = ?, hero_notes = ?, note = ?, updated_at = ? WHERE id = ?')
    .bind(JSON.stringify(s.team), JSON.stringify(s.skills), JSON.stringify(s.heroNotes), s.note, Date.now(), params.id)
    .run();
  if (!r.meta.changes) throw new HttpError(404, 'not_found');
  return { ok: true };
});

on('DELETE', '/counters/:id', { role: 'editor' }, async ({ env, request, ctx, params }) => {
  await env.DB.prepare('DELETE FROM counters WHERE id = ?').bind(params.id).run();
  await audit(env, request, ctx.member.discord_id, 'counter_delete', params.id);
  return { ok: true };
});

on('POST', '/plans', { role: 'editor' }, async ({ env, body }) => {
  const s = S.plan(body);
  const id = newId();
  const now = Date.now();
  await env.DB.prepare('INSERT INTO plans (id, title, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').bind(id, s.title, s.data, now, now).run();
  return { id };
});

on('PUT', '/plans/:id', { role: 'editor' }, async ({ env, body, params }) => {
  const s = S.plan(body);
  const r = await env.DB.prepare('UPDATE plans SET title = ?, data = ?, updated_at = ? WHERE id = ?').bind(s.title, s.data, Date.now(), params.id).run();
  if (!r.meta.changes) throw new HttpError(404, 'not_found');
  return { ok: true };
});

on('DELETE', '/plans/:id', { role: 'editor' }, async ({ env, request, ctx, params }) => {
  await env.DB.prepare('DELETE FROM plans WHERE id = ?').bind(params.id).run();
  await audit(env, request, ctx.member.discord_id, 'plan_delete', params.id);
  return { ok: true };
});

// ---------- admin ----------

on('GET', '/members', { role: 'admin' }, async ({ env }) => {
  const { results } = await env.DB.prepare('SELECT * FROM members ORDER BY last_seen DESC').all();
  return { members: results.map(publicMember) };
});

on('POST', '/members', { role: 'admin' }, async ({ env, request, ctx, body }) => {
  const id = String(body.discordId || '').trim();
  if (!/^\d{15,22}$/.test(id)) throw new HttpError(400, 'invalid_discord_id');
  const role = ROLES.includes(body.role) ? body.role : 'editor';
  await env.DB.prepare(
    `INSERT INTO members (discord_id, username, role, status, created_at) VALUES (?, ?, ?, 'active', ?)
     ON CONFLICT(discord_id) DO UPDATE SET role = excluded.role, status = 'active'`,
  )
    .bind(id, String(body.note || '').slice(0, 40) || null, role, Date.now())
    .run();
  await audit(env, request, ctx.member.discord_id, 'member_add', `${id} ${role}`);
  return { ok: true };
});

on('PUT', '/members/:id', { role: 'admin' }, async ({ env, request, ctx, body, params }) => {
  if (params.id === ctx.member.discord_id) throw new HttpError(400, 'cannot_edit_self');
  const role = ROLES.includes(body.role) ? body.role : null;
  const status = ['active', 'banned'].includes(body.status) ? body.status : null;
  await env.DB.prepare('UPDATE members SET role = COALESCE(?, role), status = COALESCE(?, status) WHERE discord_id = ?')
    .bind(role, status, params.id)
    .run();
  if (status === 'banned') await env.DB.prepare('DELETE FROM sessions WHERE discord_id = ?').bind(params.id).run();
  await audit(env, request, ctx.member.discord_id, 'member_update', `${params.id} ${role || ''} ${status || ''}`);
  return { ok: true };
});

on('POST', '/sessions/revoke-all', { role: 'admin' }, async ({ env, request, ctx }) => {
  await env.DB.prepare('DELETE FROM sessions WHERE id_hash != ?').bind(ctx.sessionHash).run();
  await audit(env, request, ctx.member.discord_id, 'sessions_revoke_all');
  return { ok: true };
});

on('GET', '/audit', { role: 'admin' }, async ({ env }) => {
  const { results } = await env.DB.prepare(
    `SELECT a.*, COALESCE(m.global_name, m.username) AS name FROM audit a LEFT JOIN members m ON m.discord_id = a.discord_id
     ORDER BY a.id DESC LIMIT 300`,
  ).all();
  return { audit: results };
});

on('POST', '/import', { role: 'admin' }, async ({ env, request, ctx, body }) => {
  let src = body.json;
  if (!src && body.guildCode) {
    if (!/^[A-Za-z0-9_-]{4,32}$/.test(body.guildCode)) throw new HttpError(400, 'invalid_code');
    const res = await fetch(SEVEN_K_NOTE_API + body.guildCode);
    if (!res.ok) throw new HttpError(502, 'fetch_failed');
    src = await res.json();
  }
  if (typeof src === 'string') src = parse(src, null);
  if (!src || !Array.isArray(src.targets)) throw new HttpError(400, 'invalid_json');

  const now = Date.now();
  const uid = ctx.member.discord_id;
  const stmts = [];
  let nc = 0;
  for (const t of src.targets.slice(0, 1000)) {
    const id = /^[\w-]{4,32}$/.test(t.id) ? t.id : newId();
    const s = S.target({ team: t.team, tags: t.tags, note: t.note });
    stmts.push(
      env.DB.prepare(
        `INSERT INTO targets (id, team, tags, note, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET team = excluded.team, tags = excluded.tags, note = excluded.note, updated_at = excluded.updated_at`,
      ).bind(id, JSON.stringify({ ...s.team, skills: s.skills }), JSON.stringify(s.tags), s.note, uid, t.createdAt || now, t.updatedAt || now),
    );
    for (const c of (t.counters || []).slice(0, 100)) {
      const cs = S.counter(c);
      nc++;
      stmts.push(
        env.DB.prepare(
          `INSERT INTO counters (id, target_id, team, skills, hero_notes, note, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET team = excluded.team, skills = excluded.skills, hero_notes = excluded.hero_notes, note = excluded.note, updated_at = excluded.updated_at`,
        ).bind(
          /^[\w-]{4,32}$/.test(c.id) ? c.id : newId(),
          id,
          JSON.stringify(cs.team),
          JSON.stringify(cs.skills),
          JSON.stringify(cs.heroNotes),
          cs.note,
          uid,
          c.createdAt || now,
          c.updatedAt || now,
        ),
      );
    }
  }
  for (const p of (src.plans || []).slice(0, 200)) {
    const s = S.plan({ title: p.title || 'แผน', data: p.data });
    stmts.push(
      env.DB.prepare(
        `INSERT INTO plans (id, title, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET title = excluded.title, data = excluded.data, updated_at = excluded.updated_at`,
      ).bind(/^[\w-]{4,32}$/.test(p.id) ? p.id : newId(), s.title, s.data, p.createdAt || now, p.updatedAt || now),
    );
  }
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
  const summary = { targets: src.targets.length, counters: nc, plans: (src.plans || []).length };
  await audit(env, request, uid, 'import', JSON.stringify(summary));
  return summary;
});

// ---------- dispatcher ----------

export async function onRequest({ request, env, params: p }) {
  try {
    const url = new URL(request.url);
    const path = '/' + [].concat(p.path || []).join('/');
    const route = routes.find((r) => r.method === request.method && r.re.test(path));
    if (!route) throw new HttpError(404, 'not_found');
    if (request.method !== 'GET') {
      const origin = request.headers.get('Origin');
      if (origin && origin !== url.origin) throw new HttpError(403, 'bad_origin');
    }
    const params = Object.fromEntries(route.keys.map((k, i) => [k, decodeURIComponent(path.match(route.re)[i + 1])]));
    const ctx = await requireSession(env, request);
    if (route.opts.role) requireRole(ctx.member, route.opts.role);
    if (route.opts.unlock !== false) await requireUnlock(env, request, ctx);
    const body = request.method === 'GET' ? {} : await request.json().catch(() => ({}));
    return json(await route.handler({ env, request, ctx, body, params }));
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: 'server_error' }, 500);
  }
}
