import { adminIds, createSession, SESSION_COOKIE, SESSION_DAYS } from '../../lib/auth.js';
import { cookie, redirect } from '../../lib/util.js';

// Local development only: requires DEV_LOGIN=true (set in .dev.vars) AND a localhost request.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (env.DEV_LOGIN !== 'true' || !['localhost', '127.0.0.1'].includes(url.hostname)) {
    return new Response('Not found', { status: 404 });
  }
  const id = adminIds(env)[0];
  if (!id) return new Response('Set ADMIN_DISCORD_IDS in .dev.vars', { status: 500 });
  await env.DB.prepare(
    `INSERT INTO members (discord_id, username, global_name, role, status, created_at) VALUES (?, 'dev', 'Dev Admin', 'admin', 'active', ?)
     ON CONFLICT(discord_id) DO NOTHING`,
  )
    .bind(id, Date.now())
    .run();
  return redirect('/', { 'Set-Cookie': cookie(SESSION_COOKIE, await createSession(env, id), SESSION_DAYS * 86400) });
}
