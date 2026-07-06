import { Suspense } from 'react';
import { ResetPasswordForm } from './reset-password-form';

function ResetPasswordFallback() {
  return (
    <main className="auth-page" aria-labelledby="reset-title">
      <section className="auth-card">
        <p className="eyebrow">Account recovery</p>
        <h1 id="reset-title">Choose a new password</h1>
        <p className="lead">Loading password reset form...</p>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
