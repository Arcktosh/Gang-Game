import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/features/auth/auth-form';
import { getCurrentSession } from '@/lib/server-session';

export default async function RegisterPage() {
  const session = await getCurrentSession();

  if (session) {
    redirect('/dashboard');
  }

  return (
    <main className="auth-page" aria-labelledby="register-title">
      <section className="auth-card">
        <p className="eyebrow">New player</p>
        <h1 id="register-title">Create account</h1>
        <p className="lead">
          Create a player account before creating your first character and entering the city.
        </p>
        <AuthForm mode="register" />
        <p className="auth-card__footer">
          Already registered? <Link href="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}
