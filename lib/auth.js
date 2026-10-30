import { HttpError, hmac, parseCookies, randomToken, safeEqual, sha256 } from './util.js';

export const SESSION_COOKIE = '__Host-egg2k_sid';
export const SESSION_DAYS = 7;
export const ROLES = ['viewer', 'editor', 'admin'];

export function requireSecret(env) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new HttpError(500, 'SESSION_SECRET not configured');
  return env.SESSION_SECRET;
}

export function adminIds(env) {
  return (env.ADMIN_DISCORD_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
}

// The site owner (like the Discord server owner): always admin, cannot be changed or banned by anyone,
// and the only one who may appoint or remove admins. Override with the OWNER_DISCORD_ID variable.
const DEFAULT_OWNER_ID = '569490669412810789';
export const ownerId = (env) => (env.OWNER_DISCORD_ID || DEFAULT_OWNER_ID).trim();
export const isOwner = (env, discordId) => discordId === ownerId(env);

export async function createSession(env, discordId) {
  const token = randomToken(32);
  const now = Date.now();
  await env.DB.prepare('INSERT INTO sessions (id_hash, discord_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), discordId, now, now + SESSION_DAYS * 864e5)
    .run();
  return token;
}

export async function destroySession(env, request) {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE id_hash = ?').bind(await sha256(token)).run();
}

// Returns { member, sessionHash } or throws 401/403
export async function requireSession(env, request) {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token) throw new HttpError(401, 'not_logged_in');
  const sessionHash = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT m.*, s.expires_at FROM sessions s JOIN members m ON m.discord_id = s.discord_id WHERE s.id_hash = ?`,
  )
    .bind(sessionHash)
    .first();
  if (!row || row.expires_at < Date.now()) throw new HttpError(401, 'not_logged_in');
  if (row.status !== 'active') throw new HttpError(403, 'banned');
  if (isOwner(env, row.discord_id) || adminIds(env).includes(row.discord_id)) row.role = 'admin';
  const now = Date.now();
  if (!row.last_seen || now - row.last_seen > 5 * 60e3) {
    await env.DB.prepare('UPDATE members SET last_seen = ? WHERE discord_id = ?').bind(now, row.discord_id).run();
  }
  return { member: row, sessionHash };
}

export function requireRole(member, role) {
  if (ROLES.indexOf(member.role) < ROLES.indexOf(role)) throw new HttpError(403, 'forbidden');
}

export async function getSetting(env, key) {
  const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
  return row ? row.value : null;
}

export async function setSettings(env, obj) {
  await env.DB.batch(
    Object.entries(obj).map(([k, v]) =>
      env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(
        k,
        String(v),
      ),
    ),
  );
}

// Unlock token: proves the guild password was entered in this session for the current password version.
// It is bound to the session cookie, so a leaked token alone is useless.
export async function issueUnlock(env, member, sessionHash) {
  const pwv = (await getSetting(env, 'pw_version')) || '0';
  const exp = Date.now() + Number(env.UNLOCK_MINUTES || 120) * 60e3;
  const payload = `${member.discord_id}.${pwv}.${exp}`;
  const sig = await hmac(requireSecret(env), `unlock|${payload}|${sessionHash}`);
  return { token: `${payload}.${sig}`, expiresAt: exp };
}

export async function requireUnlock(env, request, ctx) {
  const token = request.headers.get('X-Unlock') || '';
  const [uid, pwv, exp, sig] = token.split('.');
  if (!sig || uid !== ctx.member.discord_id || Number(exp) < Date.now()) throw new HttpError(423, 'locked');
  const expected = await hmac(requireSecret(env), `unlock|${uid}.${pwv}.${exp}|${ctx.sessionHash}`);
  if (!safeEqual(sig, expected)) throw new HttpError(423, 'locked');
  if (pwv !== ((await getSetting(env, 'pw_version')) || '0')) throw new HttpError(423, 'locked');
}
