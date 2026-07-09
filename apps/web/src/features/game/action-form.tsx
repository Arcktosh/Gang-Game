'use client';

import { FormEvent, ReactNode, useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/features/ui/toast-provider';

type FieldOption = {
  label: string;
  value: string;
};

type ActionField = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'select' | 'textarea';
  defaultValue?: string | number;
  min?: number;
  max?: number;
  placeholder?: string;
  options?: FieldOption[];
  omitWhenEmpty?: boolean;
};

type ActionCooldown = {
  lockedUntil: string | Date;
  message?: string;
} | null;

type GameActionFormProps = {
  endpoint: string;
  label: string;
  payload: Record<string, unknown>;
  fields?: ActionField[];
  helper?: ReactNode;
  submitLabel?: string;
  successMessage?: string;
  idempotent?: boolean;
  disabled?: boolean;
  disabledReason?: ReactNode;
  cooldown?: ActionCooldown;
  hidden?: boolean;
  method?: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
};

function createIdempotencyKey(endpoint: string) {
  const scope = endpoint.replace(/[^A-Za-z0-9]+/g, ':').replace(/^:+|:+$/g, 'action');
  return `${scope}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

function parseValue(field: ActionField, value: FormDataEntryValue | null) {
  if (field.type === 'number') {
    return Number(value ?? field.defaultValue ?? 0);
  }

  return String(value ?? field.defaultValue ?? '');
}

function formatRemainingTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

export function GameActionForm({
  endpoint,
  label,
  payload,
  fields = [],
  helper,
  submitLabel = label,
  successMessage = 'Action completed.',
  idempotent = true,
  disabled = false,
  disabledReason,
  cooldown = null,
  hidden = false,
  method = 'POST',
}: GameActionFormProps) {
  const router = useRouter();
  const toast = useToast();
  const formId = useId();
  const [isPending, setIsPending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const helperId = `${formId}-helper`;
  const disabledNoteId = `${formId}-disabled`;
  const cooldownUntil = cooldown ? new Date(cooldown.lockedUntil).getTime() : 0;
  const cooldownRemainingMs = Math.max(cooldownUntil - now, 0);
  const isCooldownActive = cooldownRemainingMs > 0;
  const cooldownReason = isCooldownActive
    ? `Cooldown: ${formatRemainingTime(cooldownRemainingMs)} remaining.`
    : null;
  const isDisabled = disabled || isCooldownActive || isPending;
  const effectiveDisabledReason = cooldownReason ?? disabledReason;

  useEffect(() => {
    if (!cooldownUntil || cooldownUntil <= Date.now()) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [cooldownUntil]);

  if (hidden) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disabled || isCooldownActive) {
      if (effectiveDisabledReason) {
        toast.warning(String(effectiveDisabledReason), 'Action unavailable');
      }
      return;
    }

    const formData = new FormData(event.currentTarget);
    const requestPayload: Record<string, unknown> = { ...payload };

    for (const field of fields) {
      const parsedValue = parseValue(field, formData.get(field.name));
      if (field.omitWhenEmpty && typeof parsedValue === 'string' && parsedValue.trim() === '') {
        continue;
      }
      requestPayload[field.name] = parsedValue;
    }

    setIsPending(true);
    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'content-type': 'application/json',
          ...(idempotent ? { 'idempotency-key': createIdempotencyKey(endpoint) } : {}),
        },
        body: JSON.stringify(requestPayload),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(body?.error?.message ?? `Request failed with ${response.status}.`);
        return;
      }

      toast.success(successMessage);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Request failed.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      className={`action-form${isDisabled ? ' action-form--disabled' : ''}`}
      onSubmit={handleSubmit}
      aria-describedby={
        [helper ? helperId : null, effectiveDisabledReason ? disabledNoteId : null]
          .filter(Boolean)
          .join(' ') || undefined
      }
    >
      {fields.map((field) => {
        const fieldId = `${formId}-${field.name}`;
        return (
          <label className="action-form__label" htmlFor={fieldId} key={field.name}>
            <span>{field.label}</span>
            {field.type === 'select' ? (
              <select
                className="action-form__control"
                id={fieldId}
                name={field.name}
                defaultValue={String(field.defaultValue ?? field.options?.[0]?.value ?? '')}
                disabled={isDisabled}
              >
                {(field.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea
                className="action-form__control"
                id={fieldId}
                name={field.name}
                defaultValue={field.defaultValue}
                placeholder={field.placeholder}
                rows={4}
                disabled={isDisabled}
              />
            ) : (
              <input
                className="action-form__control"
                id={fieldId}
                name={field.name}
                type={field.type ?? 'text'}
                defaultValue={field.defaultValue}
                min={field.min}
                max={field.max}
                placeholder={field.placeholder}
                disabled={isDisabled}
              />
            )}
          </label>
        );
      })}
      {helper ? (
        <p className="action-form__helper" id={helperId}>
          {helper}
        </p>
      ) : null}
      {effectiveDisabledReason ? (
        <p className="action-form__disabled-note" id={disabledNoteId} aria-live="polite">
          {effectiveDisabledReason}
        </p>
      ) : null}
      <button className="action-form__button" disabled={isDisabled} type="submit">
        {isPending
          ? 'Working...'
          : isCooldownActive
            ? `Ready in ${formatRemainingTime(cooldownRemainingMs)}`
            : submitLabel}
      </button>
    </form>
  );
}
