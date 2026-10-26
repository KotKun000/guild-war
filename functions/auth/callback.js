import { adminIds, createSession, SESSION_COOKIE, SESSION_DAYS } from '../../lib/auth.js';
import { audit, cookie, parseCookies, redirect, safeEqual, safeNext } from '../../lib/util.js';
import { STATE_COOKIE } from './login.js';

const API = 'https://discord.com/api/v10';

async function checkServerMembership(env, accessToken) {
  if (!env.DISCORD_SERVER_ID) return false;
  const res = await fetch(`${API}/users/@me/guilds/${env.DISCORD_SERVER_ID}/member`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return false;
  const m = await res.json();
  return !env.DISCORD_ROLE_ID || (m.roles || []).includes(env.DISCORD_ROLE_ID);
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const clearState = cookie(STATE_COOKIE, '', 0);
  const fail = (reason) => redirect(`/?error=${reason}`, { 'Set-Cookie': clearState });

  const [state, next] = (parseCookies(request)[STATE_COOKIE] || '').split('|');
  const code = url.searchParams.get('code');
  if (!state || !code || !safeEqual(state, url.searchParams.get('state') || '')) return fail('state');

  const tokenRes = await fetch(`${API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${url.origin}/auth/callback`,
    }),
  });
  if (!tokenRes.ok) return fail('oauth');
  const { access_token } = await tokenRes.json();

  const userRes = await fetch(`${API}/users/@me`, { headers: { Authorization: `Bearer ${access_token}` } });
  if (!userRes.ok) return fail('oauth');
  const user = await userRes.json();

  const now = Date.now();
  const existing = await env.DB.prepare('SELECT role, status FROM members WHERE discord_id = ?').bind(user.id).first();
  const isAdmin = adminIds(env).includes(user.id);

  let role = existing?.role;
  if (existing?.status === 'banned' && !isAdmin) {
    await audit(env, request, user.id, 'login_denied', 'banned');
    return fail('denied');
  }
  if (isAdmin) role = 'admin';
  else if (!existing) {
    if (!(await checkServerMembership(env, access_token))) {
      await audit(env, request, user.id, 'login_denied', `${user.username} not whitelisted`);
      return fail('denied');
    }
    role = env.DEFAULT_ROLE === 'editor' ? 'editor' : 'viewer';
  }

  await env.DB.prepare(
    `INSERT INTO members (discord_id, username, global_name, avatar, role, status, created_at, last_seen, mfa)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
     ON CONFLICT(discord_id) DO UPDATE SET username = excluded.username, global_name = excluded.global_name,
       avatar = excluded.avatar, role = excluded.role, status = 'active', last_seen = excluded.last_seen, mfa = excluded.mfa`,
  )
    .bind(user.id, user.username, user.global_name || null, user.avatar || null, role, now, now, user.mfa_enabled ? 1 : 0)
    .run();

  const token = await createSession(env, user.id);
  await audit(env, request, user.id, 'login', user.username);
  return redirect(safeNext(next), {
    'Set-Cookie': [clearState, cookie(SESSION_COOKIE, token, SESSION_DAYS * 86400)],
  });
}
