'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/features/ui/toast-provider';

type Mode = 'login' | 'register';

type AuthFormProps = {
  mode: Mode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload: Record<string, string> = {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    };

    if (mode === 'register') {
      payload.displayName = String(formData.get('displayName') ?? '');
    }

    const response = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      toast.error(result?.error?.message ?? 'Authentication failed.');
      setIsSubmitting(false);
      return;
    }

    toast.success(mode === 'register' ? 'Account created.' : 'Logged in.');
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {mode === 'register' ? (
        <label className="form-label">
          Display name
          <input name="displayName" minLength={2} maxLength={40} placeholder="Street name" />
        </label>
      ) : null}
      <label className="form-label">
        Email
        <input name="email" type="email" required placeholder="player@example.com" />
      </label>
      <label className="form-label">
        Password
        <input name="password" type="password" required minLength={8} />
      </label>
      <button disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Working...' : mode === 'register' ? 'Create account' : 'Login'}
      </button>
      {mode === 'login' ? (
        <p className="auth-card__footer">
          <Link href="/forgot-password">Forgot password?</Link> ·{' '}
          <Link href="/request-verification">Resend verification</Link>
        </p>
      ) : (
        <p className="auth-card__footer">
          Already registered? <Link href="/login">Login instead.</Link>
        </p>
      )}
    </form>
  );
}
