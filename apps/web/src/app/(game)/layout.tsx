import type { ReactNode } from 'react';
import { listCharactersForUser } from '@drugdeal/db';
import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/server-session';

export default async function GameLayout({ children }: { children: ReactNode }) {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  const characters = await listCharactersForUser(session.user.id);

  if (characters.length === 0) {
    redirect('/create-character');
  }

  return children;
}
