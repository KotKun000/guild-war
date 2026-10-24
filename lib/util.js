export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
};

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...SECURITY_HEADERS, ...headers },
  });
}

export function redirect(location, headers = {}) {
  const h = new Headers({ Location: location, ...SECURITY_HEADERS });
  for (const [k, v] of Object.entries(headers)) [].concat(v).forEach((x) => h.append(k, x));
  return new Response(null, { status: 302, headers: h });
}

const enc = new TextEncoder();

export function b64url(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64url(str) {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

export function randomToken(bytes = 32) {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

const ID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
export function newId(len = 10) {
  const r = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(r, (b) => ID_CHARS[b % ID_CHARS.length]).join('');
}

export async function sha256(str) {
  return b64url(await crypto.subtle.digest('SHA-256', enc.encode(str)));
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

export async function hmac(secret, data) {
  return b64url(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(data)));
}

export function safeEqual(a, b) {
  const x = enc.encode(String(a));
  const y = enc.encode(String(b));
  if (x.length !== y.length) return false;
  if (crypto.subtle.timingSafeEqual) return crypto.subtle.timingSafeEqual(x, y);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

// Workers cap PBKDF2 at 100k iterations
const PBKDF2_ITER = 100000;

export async function hashPassword(password, saltB64 = b64url(crypto.getRandomValues(new Uint8Array(16)))) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromB64url(saltB64), iterations: PBKDF2_ITER },
    key,
    256,
  );
  return { salt: saltB64, hash: b64url(bits) };
}

export function parseCookies(request) {
  const out = {};
  for (const part of (request.headers.get('Cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function cookie(name, value, maxAge, extra = 'SameSite=Lax') {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; ${extra}`;
}

export function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || '';
}

export async function audit(env, request, discordId, action, detail = '') {
  await env.DB.prepare('INSERT INTO audit (ts, discord_id, action, detail, ip) VALUES (?, ?, ?, ?, ?)')
    .bind(Date.now(), discordId || null, action, String(detail).slice(0, 500), clientIp(request))
    .run();
}

export function safeNext(next) {
  return typeof next === 'string' && /^\/(?![/\\])/.test(next) ? next : '/';
}
