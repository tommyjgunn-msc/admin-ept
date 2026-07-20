// utils/withAdminAuth.js — Require a valid admin session on API routes.
//
// Before this existed, every admin API route hit Google Sheets with no session
// check at all: anyone who knew a URL could create or modify tests. The login
// screen was a client-side gate only.
import { getAdminSession, getAdminSessionToken } from './adminSession';

// Values in the AdminAuth "permissions" column (C) that mean "may look, not touch".
const READ_ONLY_PERMISSIONS = ['read', 'readonly', 'read-only', 'viewer', 'view'];

/**
 * Whether an admin may perform write actions.
 *
 * Deliberately fail-open: the vocabulary actually used in the live AdminAuth
 * sheet is not known to this code, so an unrecognised or blank value grants
 * write access. Locking real admins out of their own portal is a worse failure
 * than being mildly permissive. Tighten this once the sheet's values are known.
 */
export function canWrite(permissions) {
  const value = String(permissions || '').trim().toLowerCase();
  return !READ_ONLY_PERMISSIONS.includes(value);
}

/**
 * Wrap an API handler so it requires a signed admin session cookie.
 * Attaches req.admin = { username, permissions }.
 *
 * @param {Function} handler
 * @param {Object} options
 * @param {boolean} options.requireWrite - reject read-only admins (default: true
 *   for non-GET methods, false for GET)
 */
export function withAdminAuth(handler, options = {}) {
  return async function adminAuthMiddleware(req, res) {
    const token = getAdminSessionToken(req);
    const session = getAdminSession(token);

    if (!session) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Admin sign-in required.',
      });
    }

    const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    const requireWrite = options.requireWrite ?? isMutation;

    if (requireWrite && !canWrite(session.admin.permissions)) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'Your admin account does not have edit permissions.',
      });
    }

    req.admin = session.admin;

    try {
      return await handler(req, res);
    } catch (error) {
      console.error(`[Admin API Error] ${req.url}:`, error.message);
      return res.status(500).json({
        error: 'internal_error',
        message: 'An unexpected error occurred.',
        ...(process.env.NODE_ENV === 'development' && { detail: error.message }),
      });
    }
  };
}
