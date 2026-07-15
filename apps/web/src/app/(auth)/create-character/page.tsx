import { listCharactersForUser } from '@drugdeal/db';
import { redirect } from 'next/navigation';
import { CharacterCreationForm } from '@/features/auth/character-creation-form';
import { LogoutButton } from '@/features/auth/logout-button';
import { getCurrentSession } from '@/lib/server-session';

export default async function CreateCharacterPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  const characters = await listCharactersForUser(session.user.id);

  if (characters.length > 0) {
    redirect('/dashboard');
  }

  return (
    <main className="auth-page" aria-labelledby="create-character-title">
      <section className="auth-card">
        <p className="eyebrow">Required setup</p>
        <h1 id="create-character-title">Create your character</h1>
        <p className="lead">
          Every game system is tied to a character. Create one now to unlock the dashboard and the rest of the city.
        </p>
        <CharacterCreationForm />
        <div className="auth-card__footer">
          Signed in as {session.user.email}. <LogoutButton />
        </div>
      </section>
    </main>
  );
}
