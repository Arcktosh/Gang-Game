import { createHash, randomBytes } from 'node:crypto';
import {
  createUserSession,
  deleteUserSession,
  findActiveUserBySessionTokenHash,
  touchUserSession,
} from '@drugdeal/db';
import { NextRequest, NextResponse } from 'next/server';

export const SESSION_COOKIE_NAME = 'dd_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function createSessionToken() {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(sessionToken: string) {
  return createHash('sha256').update(sessionToken).digest('hex');
}

export function createOneTimeAccountToken() {
  return randomBytes(32).toString('base64url');
}

export function hashOneTimeAccountToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function createSessionResponse(input: {
  request: NextRequest;
  userId: string;
  response: NextResponse;
}) {
  const sessionToken = createSessionToken();
  const sessionTokenHash = hashSessionToken(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await createUserSession({
    userId: input.userId,
    sessionTokenHash,
    userAgent: input.request.headers.get('user-agent'),
    ipAddress: input.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    expiresAt,
  });

  input.response.cookies.set(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions());
  return input.response;
}

export async function getSessionFromRequest(request: NextRequest) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const sessionTokenHash = hashSessionToken(sessionToken);
  const session = await findActiveUserBySessionTokenHash(sessionTokenHash);

  if (!session) {
    return null;
  }

  await touchUserSession(sessionTokenHash);
  return session;
}

export async function clearSessionFromRequest(request: NextRequest, response: NextResponse) {
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await deleteUserSession(hashSessionToken(sessionToken));
  }

  response.cookies.set(SESSION_COOKIE_NAME, '', { ...getSessionCookieOptions(), maxAge: 0 });
  return response;
}
