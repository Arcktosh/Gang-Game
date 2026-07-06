'use client';

import { FormEvent, useState } from 'react';
import { useToast } from '@/features/ui/toast-provider';

type ResetRequestResult = {
  data?: {
    message?: string;
    resetUrl?: string | null;
  };
  error?: { message?: string };
};

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResetUrl(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch('/api/auth/password-reset/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: String(formData.get('email') ?? '') }),
    });
    const result = (await response.json().catch(() => null)) as ResetRequestResult | null;

    setIsSubmitting(false);

    if (!response.ok) {
      toast.error(result?.error?.message ?? 'Unable to prepare password reset.');
      return;
    }

    toast.success(result?.data?.message ?? 'Check your email for the reset link.');
    setResetUrl(result?.data?.resetUrl ?? null);
  }

  return (
    <main className="auth-page" aria-labelledby="auth-title">
      <section className="auth-card">
        <p className="eyebrow">Account recovery</p>
        <h1 id="auth-title">Password reset</h1>
        <p className="lead">Enter your account email. Unknown email addresses receive the same generic response for account privacy.</p>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="form-label">
            Email
            <input name="email" type="email" required placeholder="player@example.com" />
          </label>
          {resetUrl ? (
            <p className="auth-card__footer">
              Development reset link: <a href={resetUrl}>{resetUrl}</a>
            </p>
          ) : null}
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Preparing...' : 'Send reset link'}
          </button>
        </form>
      </section>
    </main>
  );
}
