// utils/adminSession.js — Signed cookie sessions for the admin portal.
//
// Ported from ept-portal's session.js. Uses HMAC-signed tokens rather than
// in-memory storage so sessions survive across serverless function instances.
// The secret falls back to a slice of the Google credentials, so this works
// without provisioning a new env var on the admin project.
import { createHmac, timingSafeEqual } from 'crypto';

const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 hours — an admin working session
const COOKIE_NAME = 'ept_admin_session';
const isProduction = process.env.NODE_ENV === 'production';

function getSecret() {
  return process.env.SESSION_SECRET
    || process.env.GOOGLE_PRIVATE_KEY?.slice(0, 64)
    || 'admin-ept-default-secret-change-me';
}

function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', getSecret()).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [data, sig] = parts;
  const expectedSig = createHmac('sha256', getSecret()).update(data).digest('base64url');

  try {
    const sigBuf = Buffer.from(sig, 'base64url');
    const expectedBuf = Buffer.from(expectedSig, 'base64url');
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createAdminSession(admin) {
  return sign({
    admin: {
      username: admin.username,
      permissions: admin.permissions || '',
    },
    iat: Date.now(),
    exp: Date.now() + SESSION_TTL,
  });
}

export function getAdminSession(token) {
  const payload = verify(token);
  if (!payload) return null;
  return { admin: payload.admin, token };
}

export function setAdminSessionCookie(res, token) {
  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_TTL / 1000)}`,
    isProduction ? 'Secure' : '',
  ].filter(Boolean).join('; '));
}

export function clearAdminSessionCookie(res) {
  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    isProduction ? 'Secure' : '',
  ].filter(Boolean).join('; '));
}

export function getAdminSessionToken(req) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}
