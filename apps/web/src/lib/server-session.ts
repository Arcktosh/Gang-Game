import { findActiveUserBySessionTokenHash, touchUserSession } from '@drugdeal/db';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, hashSessionToken } from './auth';

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

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
