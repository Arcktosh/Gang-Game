import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/features/auth/auth-form';
import { getCurrentSession } from '@/lib/server-session';

export default async function LoginPage() {
  const session = await getCurrentSession();

  if (session) {
    redirect('/dashboard');
  }

  return (
    <main className="auth-page" aria-labelledby="login-title">
      <section className="auth-card">
        <p className="eyebrow">Account access</p>
        <h1 id="login-title">Login</h1>
        <p className="lead">Enter the persistent game world and continue your character progression.</p>
        <AuthForm mode="login" />
        <p className="auth-card__footer">
          No account yet? <Link href="/register">Create one</Link>
        </p>
      </section>
    </main>
  );
}
