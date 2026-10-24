import { destroySession, SESSION_COOKIE } from '../../lib/auth.js';
import { cookie, json } from '../../lib/util.js';

export async function onRequestPost({ request, env }) {
  await destroySession(env, request);
  return json({ ok: true }, 200, { 'Set-Cookie': cookie(SESSION_COOKIE, '', 0) });
}
