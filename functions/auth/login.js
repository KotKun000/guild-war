import { cookie, randomToken, redirect, safeNext } from '../../lib/util.js';

export const STATE_COOKIE = '__Host-egg2k_state';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (!/^\d{15,22}$/.test(env.DISCORD_CLIENT_ID || '')) {
    return new Response('DISCORD_CLIENT_ID is missing or invalid (must be the numeric Application ID from the Discord Developer Portal)', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  const state = randomToken(24);
  const next = safeNext(url.searchParams.get('next'));
  const scopes = ['identify'];
  if (env.DISCORD_SERVER_ID) scopes.push('guilds.members.read');
  const auth = new URL('https://discord.com/oauth2/authorize');
  auth.search = new URLSearchParams({
    response_type: 'code',
    client_id: env.DISCORD_CLIENT_ID,
    scope: scopes.join(' '),
    redirect_uri: `${url.origin}/auth/callback`,
    state,
  });
  return redirect(auth.toString(), { 'Set-Cookie': cookie(STATE_COOKIE, `${state}|${next}`, 600) });
}
