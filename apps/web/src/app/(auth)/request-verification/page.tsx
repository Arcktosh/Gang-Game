'use client';

import { FormEvent, useState } from 'react';
import { useToast } from '@/features/ui/toast-provider';

type VerificationRequestResult = {
  data?: {
    message?: string;
    verificationUrl?: string | null;
  };
  error?: { message?: string };
};

export default function RequestVerificationPage() {
  const toast = useToast();
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerificationUrl(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch('/api/auth/email-verification/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: String(formData.get('email') ?? '') }),
    });
    const result = (await response.json().catch(() => null)) as VerificationRequestResult | null;

    setIsSubmitting(false);

    if (!response.ok) {
      toast.error(result?.error?.message ?? 'Unable to prepare verification link.');
      return;
    }

    toast.success(result?.data?.message ?? 'Check your email for the verification link.');
    setVerificationUrl(result?.data?.verificationUrl ?? null);
  }

  return (
    <main className="auth-page" aria-labelledby="auth-title">
      <section className="auth-card">
        <p className="eyebrow">Account recovery</p>
        <h1 id="auth-title">Resend verification</h1>
        <p className="lead">Request a fresh email verification link for your account.</p>
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="form-label">
            Email
            <input name="email" type="email" required placeholder="player@example.com" />
          </label>
          {verificationUrl ? (
            <p className="auth-card__footer">
              Development verification link: <a href={verificationUrl}>{verificationUrl}</a>
            </p>
          ) : null}
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Preparing...' : 'Send verification link'}
          </button>
        </form>
      </section>
    </main>
  );
}
