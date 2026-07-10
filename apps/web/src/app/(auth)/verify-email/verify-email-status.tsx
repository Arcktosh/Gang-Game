'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/features/ui/toast-provider';

type VerifyResult = {
  data?: { message?: string };
  error?: { message?: string };
};

export function VerifyEmailStatus() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Missing verification token.');
      return;
    }

    let cancelled = false;

    async function verify() {
      const response = await fetch('/api/auth/email-verification/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const result = (await response.json().catch(() => null)) as VerifyResult | null;

      if (cancelled) {
        return;
      }

      if (!response.ok) {
        toast.error(result?.error?.message ?? 'Unable to verify email.');
        return;
      }

      toast.success(result?.data?.message ?? 'Email verified successfully.');
      setIsComplete(true);
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [toast, token]);

  return (
    <main className="auth-page" aria-labelledby="verify-title">
      <section className="auth-card">
        <p className="eyebrow">Account security</p>
        <h1 id="verify-title">Email verification</h1>
        {!isComplete ? <p className="lead">Verifying your email address...</p> : <p className="lead">Your email status has been updated.</p>}
        <Link className="button-link button-link--primary" href="/dashboard">Continue to dashboard</Link>
      </section>
    </main>
  );
}
