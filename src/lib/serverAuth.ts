import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const ADMIN_COOKIE_NAME = 'jl_admin_session';

/**
 * Returns the configured admin password from environment variables.
 * Strictly checks process.env.ADMIN_SECRET_PASSWORD and process.env.ADMIN_PASSWORD.
 * Never falls back to a hardcoded string.
 */
export function getAdminSecretPassword(): string | null {
  const secret =
    process.env.ADMIN_SECRET_PASSWORD?.trim() ||
    process.env.ADMIN_PASSWORD?.trim();
  return secret || null;
}

/**
 * Generates a deterministic SHA-256 session token from the admin secret password.
 */
export function getExpectedAdminToken(): string | null {
  const secret = getAdminSecretPassword();
  if (!secret) return null;
  return crypto
    .createHash('sha256')
    .update(`${secret}:jl_secure_admin_session_v1`)
    .digest('hex');
}

/**
 * Verifies whether an incoming API request is authorized as admin.
 * Checks:
 * 1. Secure httpOnly cookie 'jl_admin_session' matching expected hash
 * 2. Header 'x-admin-password' matching process.env.ADMIN_SECRET_PASSWORD
 * 3. Header 'x-admin-token' matching expected session hash
 */
export function verifyAdminRequest(req: NextRequest | Request): boolean {
  const secret = getAdminSecretPassword();
  const expectedToken = getExpectedAdminToken();
  if (!secret || !expectedToken) return false;

  // 1. Check header 'x-admin-password'
  const headerPassword = req.headers.get('x-admin-password')?.trim();
  if (headerPassword && headerPassword === secret) {
    return true;
  }

  // 2. Check header 'x-admin-token'
  const headerToken = req.headers.get('x-admin-token')?.trim();
  if (headerToken && headerToken === expectedToken) {
    return true;
  }

  // 3. Check cookie 'jl_admin_session' on NextRequest
  if ('cookies' in req && typeof req.cookies?.get === 'function') {
    const cookie = req.cookies.get(ADMIN_COOKIE_NAME);
    if (cookie?.value && cookie.value === expectedToken) {
      return true;
    }
  }

  // Fallback for standard Request header 'cookie'
  const cookieHeader = req.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(
      new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE_NAME}=([^;]+)`)
    );
    if (match && match[1] === expectedToken) {
      return true;
    }
  }

  return false;
}

/**
 * Sets the secure httpOnly admin session cookie on a NextResponse.
 */
export function setAdminSessionCookie(res: NextResponse): void {
  const token = getExpectedAdminToken();
  if (!token) return;

  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

/**
 * Clears the admin session cookie on a NextResponse.
 */
export function clearAdminSessionCookie(res: NextResponse): void {
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
