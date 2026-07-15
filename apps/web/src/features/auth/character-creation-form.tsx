'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/features/ui/toast-provider';

export function CharacterCreationForm() {
  const router = useRouter();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: String(formData.get('name') ?? '') }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error?.message ?? 'Character creation failed.');
      }

      toast.success('Character created. Welcome to the city.');
      router.replace('/dashboard');
      router.refresh();
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Character creation failed.');
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="form-label">
        Character name
        <input
          autoComplete="nickname"
          autoFocus
          maxLength={24}
          minLength={3}
          name="name"
          placeholder="Choose a street name"
          required
        />
      </label>
      <p className="action-form__helper">
        This character becomes your active identity for market, faction, contract, and progression systems.
      </p>
      <button disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Creating character...' : 'Create character'}
      </button>
    </form>
  );
}
