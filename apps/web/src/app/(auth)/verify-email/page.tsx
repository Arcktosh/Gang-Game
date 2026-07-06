import { Suspense } from 'react';
import { VerifyEmailStatus } from './verify-email-status';

function VerifyEmailFallback() {
  return (
    <main className="auth-page" aria-labelledby="verify-title">
      <section className="auth-card">
        <p className="eyebrow">Account security</p>
        <h1 id="verify-title">Email verification</h1>
        <p className="lead">Preparing email verification...</p>
      </section>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailStatus />
    </Suspense>
  );
}
