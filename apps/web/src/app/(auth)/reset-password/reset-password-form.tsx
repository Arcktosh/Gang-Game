'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/features/ui/toast-provider';

type ResetResult = {
  data?: { message?: string };
  error?: { message?: string };
};

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const [isComplete, setIsComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Missing password reset token.');
    }
  }, [toast, token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch('/api/auth/password-reset/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, password: String(formData.get('password') ?? '') }),
    });
    const result = (await response.json().catch(() => null)) as ResetResult | null;

    setIsSubmitting(false);

    if (!response.ok) {
      toast.error(result?.error?.message ?? 'Unable to reset password.');
      return;
    }

    toast.success(result?.data?.message ?? 'Password reset complete.');
    setIsComplete(true);
  }

  return (
    <main className="auth-page" aria-labelledby="reset-title">
      <section className="auth-card">
        <p className="eyebrow">Account recovery</p>
        <h1 id="reset-title">Choose a new password</h1>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="form-label">
            New password
            <input name="password" type="password" required minLength={8} disabled={!token || isComplete} />
          </label>
          {isComplete ? <Link className="button-link button-link--primary" href="/login">Go to login</Link> : null}
          <button disabled={isSubmitting || !token || isComplete} type="submit">
            {isSubmitting ? 'Resetting...' : 'Reset password'}
          </button>
        </form>
      </section>
    </main>
  );
}
